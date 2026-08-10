export default function Header({ onOpenHistory, onOpenSave }) {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur px-8 py-4 flex justify-between items-center sticky top-0 z-40 shadow-sm">
      <div className="flex items-center space-x-4">
        <div className="bg-blue-600 text-white font-black px-3 py-1 rounded text-sm tracking-wider uppercase">
          LED DISPLAY
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Configurator Pro
        </h1>
        <span className="text-xs text-slate-400 border-l border-slate-200 pl-4 hidden md:inline font-medium">
          Enterprise Display Architect
        </span>
      </div>

      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenHistory}
          type="button"
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-lg transition text-sm border border-slate-300 flex items-center gap-1.5 cursor-pointer active:scale-95"
        >
          <span>📁</span> Kayıtlı Projeler
        </button>

        <button
          onClick={onOpenSave}
          type="button"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg transition text-sm shadow-md shadow-blue-600/20 cursor-pointer active:scale-95"
        >
          Projeyi Kaydet
        </button>
      </div>
    </header>
  );
}