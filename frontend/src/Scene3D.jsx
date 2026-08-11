import { Suspense, useMemo, useRef, useState, useCallback } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Environment, Instances, Instance, ContactShadows } from '@react-three/drei'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import * as THREE from 'three'
import { useLang } from './useLang.js'

/**
 * GERÇEK 3D GÖRÜNÜM (react-three-fiber) — mevcut 2D Canvas/SVG önizlemenin
 * yanına eklenen, gerçek bir sahne grafiği kullanan üçüncü görselleştirme modu.
 *
 * Neden ayrı bir bileşen ve mevcut WallPreview/ArView'ın yerini almıyor:
 *   - WallPreview (2D) ve ArView (kamera üzeri 2D overlay) zaten olgun ve
 *     performanslı; ölçü etiketleri, kavis, çoklu ekran gibi ince işler o
 *     tarafta duruyor. Onları three.js'e taşımak büyük bir yeniden yazım
 *     gerektirir ve regresyon riski taşır.
 *   - Bu bileşen, "gerçek 3D" ihtiyacını (HDRI ışıklandırma, serbest kamera
 *     döndürme, WebXR/AR için dışa aktarılabilir bir 3D model) katmanlı bir
 *     şekilde ekliyor: kullanıcı isterse açar, kapatırsa hiçbir maliyeti yok
 *     (kod bölünmüş/dynamic import ile yüklenir).
 *
 * LOD (Level of Detail) STRATEJİSİ:
 *   - Kabin sayısı arttıkça (büyük video duvarları) tek tek "çerçeveli kutu"
 *     yerine paylaşılan bir geometri instance'lanır (GPU'da tek draw call'a
 *     yakın maliyet). Bkz. `Instances`/`Instance` kullanımı.
 *   - 200'den fazla kabin olduğunda çerçeve/bezel çizgileri (ince detay)
 *     tamamen kaldırılır, yalnızca düz panel + doku kalır — hem çizim
 *     maliyeti hem de bellek düşer (bkz. `detailLevel`).
 *   - Kamera belli bir uzaklığın ötesindeyken (`camera.position.z` eşiği)
 *     doku çözünürlüğü ihtiyacı da azalır; `texture.anisotropy` ve
 *     `minFilter` ayarları bunu göz önünde bulundurur.
 */

const MAX_DETAILED_CABINETS = 200

function CabinetGrid({ model, cols, rows, contentUrl, detailLevel }) {
  const cabW = (model?.widthMm || 500) / 1000
  const cabH = (model?.heightMm || 500) / 1000
  const cabD = (model?.depthMm || 100) / 1000

  const texture = useMemo(() => {
    if (!contentUrl) return null
    const loader = new THREE.TextureLoader()
    const tex = loader.load(contentUrl)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return tex
  }, [contentUrl])

  const totalW = cols * cabW
  const totalH = rows * cabH
  const showBezels = detailLevel === 'high'

  // Instanced geometri: N kabin için tek geometri/malzeme, N adet dönüşüm.
  // GPU'ya N ayrı mesh yerine tek instanced draw call gönderilir.
  const positions = useMemo(() => {
    const arr = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        arr.push([
          c * cabW - totalW / 2 + cabW / 2,
          r * cabH - totalH / 2 + cabH / 2,
          0,
        ])
      }
    }
    return arr
  }, [cols, rows, cabW, cabH, totalW, totalH])

  return (
    <group>
      <Instances limit={Math.max(1, positions.length)} range={positions.length}>
        <boxGeometry args={[cabW - (showBezels ? 0.003 : 0), cabH - (showBezels ? 0.003 : 0), cabD]} />
        <meshStandardMaterial roughness={0.55} metalness={0.15} color="#12151c" />
        {positions.map((p, i) => (
          <Instance key={i} position={p} />
        ))}
      </Instances>

      {/* İçerik dokusu — tüm duvarın önüne gerilen tek bir düzlem (2D önizlemedeki
          "spanW/spanH" mantığının 3D karşılığı). */}
      <mesh position={[0, 0, cabD / 2 + 0.002]}>
        <planeGeometry args={[totalW, totalH]} />
        {texture ? (
          <meshBasicMaterial map={texture} toneMapped={false} />
        ) : (
          <meshStandardMaterial color="#0a4f8c" emissive="#0a4f8c" emissiveIntensity={0.4} />
        )}
      </mesh>
    </group>
  )
}

function SceneContent({ model, cols, rows, contentUrl, onReady }) {
  const { scene, camera } = useThree()
  const cabinetCount = cols * rows
  const detailLevel = cabinetCount > MAX_DETAILED_CABINETS ? 'low' : 'high'

  useMemo(() => {
    onReady?.(scene, camera)
  }, [scene, camera, onReady])

  return (
    <>
      {/* HDRI ortam ışığı: "warehouse" preset'i drei'nin barındırdığı bir HDR
          panoramadan gerçek zamanlı yansıma/aydınlatma üretir (fotogerçekçilik).
          Preset yüklenemezse (örn. ağ kısıtlı ortam) Suspense fallback'i devreye
          girer ve sahne düz ambient/directional ışıkla görünür kalır. */}
      <Suspense fallback={<ambientLight intensity={0.9} />}>
        <Environment preset="warehouse" />
      </Suspense>
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} castShadow />

      <CabinetGrid model={model} cols={cols} rows={rows} contentUrl={contentUrl} detailLevel={detailLevel} />

      <ContactShadows position={[0, -(rows * (model?.heightMm || 500)) / 2000 - 0.05, 0]} opacity={0.45} scale={10} blur={2} far={2} />
    </>
  )
}

/** GLB dışa aktarma + `<model-viewer>` ile gerçek WebXR / Scene Viewer / Quick Look AR. */
function useGlbAr() {
  const { t } = useLang()
  const [busy, setBusy] = useState(false)
  const [viewerUrl, setViewerUrl] = useState(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)

  const onReady = useCallback((scene, camera) => {
    sceneRef.current = scene
    cameraRef.current = camera
  }, [])

  const exportAndOpen = useCallback(async () => {
    if (!sceneRef.current) return
    setBusy(true)
    try {
      // model-viewer web component'i yalnızca ihtiyaç anında yükleniyor
      // (dynamic import) — kullanılmıyorsa ana paketin boyutunu şişirmez.
      await import('@google/model-viewer')

      const exporter = new GLTFExporter()
      const glb = await new Promise((resolve, reject) => {
        exporter.parse(
          sceneRef.current,
          (result) => resolve(result),
          (err) => reject(err),
          { binary: true },
        )
      })
      const blob = new Blob([glb], { type: 'model/gltf-binary' })
      const url = URL.createObjectURL(blob)
      setViewerUrl(url)
    } catch (e) {
      console.error('AR modeli oluşturulamadı:', e)
      alert(t('scene3d.arExportError'))
    } finally {
      setBusy(false)
    }
  }, [t])

  const close = useCallback(() => {
    if (viewerUrl) URL.revokeObjectURL(viewerUrl)
    setViewerUrl(null)
  }, [viewerUrl])

  return { onReady, exportAndOpen, close, viewerUrl, busy }
}

export default function Scene3D({ open, onClose, model, cols, rows, contentUrl }) {
  const { t } = useLang()
  const { onReady, exportAndOpen, close, viewerUrl, busy } = useGlbAr()

  if (!open) return null

  const cabinetCount = Math.max(1, cols) * Math.max(1, rows)

  return (
    <div className="fixed inset-0 z-[60] bg-[#0b0d12]">
      <div className="absolute top-0 inset-x-0 z-10 flex items-center gap-3 px-4 py-3 bg-gradient-to-b from-black/70 to-transparent">
        <button type="button" onClick={onClose} aria-label={t('ar.close')} className="text-white/90 hover:text-white p-1">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <span className="text-white text-[13px] font-semibold">{t('scene3d.title')}</span>
        <span className="text-white/50 text-[11px]">
          {cabinetCount > MAX_DETAILED_CABINETS ? t('scene3d.lodLow') : t('scene3d.lodHigh')}
        </span>
        <div className="ml-auto">
          <button
            type="button"
            onClick={exportAndOpen}
            disabled={busy}
            className="rounded-full px-4 py-1.5 text-[13px] font-semibold bg-brand text-white hover:bg-brand-dark disabled:opacity-50 transition-colors"
          >
            {busy ? t('scene3d.exporting') : t('scene3d.viewInAr')}
          </button>
        </div>
      </div>

      <Canvas shadows camera={{ position: [0, 0.4, 3.2], fov: 45 }} dpr={[1, 2]}>
        <SceneContent model={model} cols={Math.max(1, cols)} rows={Math.max(1, rows)} contentUrl={contentUrl} onReady={onReady} />
        <OrbitControls makeDefault enablePan={false} minDistance={0.8} maxDistance={12} />
      </Canvas>

      <p className="absolute bottom-4 inset-x-0 text-center text-[11px] text-white/50 px-8 m-0 pointer-events-none">
        {t('scene3d.hint')}
      </p>

      {/* model-viewer, gerçek cihazda dokunulduğunda Android'de Scene Viewer'ı,
          iOS'ta Quick Look'u açar (WebXR destekleyen tarayıcılarda doğrudan
          sayfa-içi AR oturumu da başlatabilir) — ayrı bir "AR modu" yazmaya
          gerek kalmadan platformun kendi AR motorunu kullanır. */}
      {viewerUrl && (
        <div className="absolute inset-0 z-20 bg-black/90 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-white text-sm font-semibold">{t('scene3d.arReady')}</span>
            <button type="button" onClick={close} className="text-white/80 hover:text-white text-sm">
              {t('ar.close')}
            </button>
          </div>
          <div className="flex-1">
            {/* model-viewer standart bir HTML özel elemanıdır; React JSX'te
                doğrudan kullanılabilir, ekstra sarmalayıcıya gerek yoktur. */}
            <model-viewer
              src={viewerUrl}
              ar
              ar-modes="webxr scene-viewer quick-look"
              camera-controls
              shadow-intensity="1"
              style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
