using System.Globalization;
using DisplayConfigurator.Application.DTOs;
using DisplayConfigurator.Application.Engine;
using DisplayConfigurator.Domain.Entities;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace DisplayConfigurator.Infrastructure.Pdf;

/// <summary>
/// Profesyonel PDF: müşteri (teknik özet + paket + nihai toplam) veya admin
/// (donanım + işçilik dökümü; eksik katalogda uyarı kutusu).
/// </summary>
public class ProfessionalReportDocument : IDocument
{
    private static readonly Color BrandBlue = Color.FromHex("#2962ad");
    private static readonly Color BrandOrange = Color.FromHex("#f37021");
    private static readonly Color Ink = Color.FromHex("#1c1c2b");

    private readonly ConfigurationResponseDto _config;
    private readonly PdfReportExtras _extras;
    private readonly Cabin? _cabin;
    private readonly bool _isAdmin;

    public ProfessionalReportDocument(
        ConfigurationResponseDto config,
        PdfReportExtras? extras = null,
        Cabin? cabin = null,
        PdfReportKind kind = PdfReportKind.Client)
    {
        _config = config;
        _extras = extras ?? new PdfReportExtras();
        _cabin = cabin;
        _isAdmin = kind == PdfReportKind.Admin;
    }

    public static string FormatAdminUnmetWarning(string? details)
    {
        var detay = string.IsNullOrWhiteSpace(details) ? "donanım" : details.Trim();
        return $"UYARI: Sistem gereksinimlerini tam karşılayan donanım veritabanında bulunamadı. Eksik parçaları [{detay}] temin ediniz.";
    }

    public void Compose(IDocumentContainer container)
    {
        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(1.8f, Unit.Centimetre);
            page.PageColor(Colors.White);
            page.DefaultTextStyle(x => x.FontSize(9.5f).FontFamily("Arial").FontColor(Ink));

            page.Header().Element(ComposeHeader);
            page.Content().Element(ComposeContent);
            page.Footer().Element(ComposeFooter);
        });

        /*
         * MEKÂNDA GÖRÜNÜM — yalnızca müşteri kamerada bir kare KAYDETTİYSE.
         * Yapılandırma görseli ekranı teknik olarak gösteriyor; bu sayfa aynı
         * ekranın müşterinin kendi mekânındaki hâlini gösteriyor. Kare yoksa
         * sayfa hiç açılmaz, rapor eskisi gibi kalır.
         */
        /*
         * Her mekân karesi ayrı bir sayfa. Kareler iki yoldan geliyor:
         * kamerada "Kaydet" denen kare ve kullanıcının rapora eklediği
         * fotoğraflar (iPhone'da Quick Look'un çektiği kareyi rapora sokmanın
         * tek yolu bu — o kare Fotoğraflar'a gidiyor, sayfa göremiyor).
         * Liste boşsa hiç sayfa açılmaz, rapor eskisi gibi kalır.
         */
        foreach (var kare in _extras.ArImages)
        {
            if (kare is not { Length: > 0 }) continue;
            var gorsel = kare;
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(1.8f, Unit.Centimetre);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(9.5f).FontFamily("Arial").FontColor(Ink));

                page.Header().Element(ComposeArHeader);
                page.Content().Element(c => ComposeArVisual(c, gorsel));
                page.Footer().Element(ComposeFooter);
            });
        }
    }

    private void ComposeArHeader(IContainer container)
    {
        var size = $"{_config.TotalWidthM:F2} × {_config.TotalHeightM:F2} m";
        container.Column(col =>
        {
            col.Item().Row(row =>
            {
                row.RelativeItem().Text("MEKÂNDA GÖRÜNÜM")
                    .FontSize(11).Bold().FontColor(BrandBlue);
                row.AutoItem().Text($"{Empty(_config.CabinModelName, "")} · {size}")
                    .FontSize(9).FontColor(Colors.Grey.Darken1);
            });
            col.Item().PaddingTop(6).Height(3).Background(BrandBlue);
            col.Item().Height(2).Background(BrandOrange);
        });
    }

    private void ComposeArVisual(IContainer container, byte[] gorsel)
    {
        container.Column(col =>
        {
            col.Item().AlignCenter().AlignMiddle()
                .Image(gorsel)
                .FitArea();
            /*
             * Kenar boşlukları TAHMİN — kamerada derinlik algılama yok, ölçek
             * müşterinin tasarımı duvara oturtmasından geliyor. Yanlış
             * anlaşılmasın diye rapor bunu açıkça yazıyor.
             */
            col.Item().PaddingTop(10)
                .Text("Kamera görüntüsü üzerine yerleştirilmiş temsilî görünüm. Ekranın kendi ölçüleri yapılandırmadan gelir ve kesindir; kenar boşlukları tahminîdir.")
                .FontSize(7.5f).FontColor(Colors.Grey.Darken1);
        });
    }

    private void ComposeScreenVisual(IContainer container)
    {
        int cols = Math.Max(1, _config.Cols);
        int rows = Math.Max(1, _config.Rows);
        int total = cols * rows;
        double wMm = _config.TotalWidthMm;
        double hMm = _config.TotalHeightMm;
        double wM = wMm / 1000.0;
        double hM = hMm / 1000.0;
        double areaM2 = _config.ScreenAreaM2 > 0
            ? (double)_config.ScreenAreaM2
            : Math.Round(wM * hM, 2);

        container.Column(outer =>
        {
        outer.Item().ShowEntire().Border(1).BorderColor(Color.FromHex("#e2e8f0")).Background(Colors.White).Padding(10).Column(col =>
        {
            col.Item().Text("Yapılandırma görseli").FontSize(12).Bold().FontColor(BrandBlue);
            col.Item().PaddingTop(8).Row(row =>
            {
                row.RelativeItem(3).Height(268).Border(1).BorderColor(Color.FromHex("#e2e8f0"))
                    .Background(Color.FromHex("#f8fafc")).Padding(6)
                    .AlignCenter().AlignMiddle().Element(DrawSchematic);
                row.ConstantItem(10);
                row.RelativeItem(2).Border(1).BorderColor(Color.FromHex("#e2e8f0"))
                    .Background(Color.FromHex("#f5f7fb")).Padding(10)
                    .Column(card =>
                    {
                        card.Item().Text("EKRAN ÖZETİ").FontSize(7).Bold().FontColor(Colors.Grey.Darken1);
                        InfoLine(card, "Panel sayısı", $"{total} adet");
                        InfoLine(card, "Dizilim", $"{cols} × {rows}");
                        InfoLine(card, "Dış ölçü", $"{wMm:N0} × {hMm:N0} mm");
                        InfoLine(card, "Ölçü", $"{wM:F2} × {hM:F2} m");
                        InfoLine(card, "Alan", $"{areaM2:F2} m²");
                        InfoLine(card, "Model", Empty(_config.CabinModelName, "—"));
                    });
            });
            col.Item().Element(DrawScreenTypeLegend);
        });

            if (_extras.PreviewImage is { Length: > 0 })
            {
                outer.Item().PaddingTop(12).ShowEntire().Column(img =>
                {
                    img.Item().Text("Müşteri görseli").FontSize(11).Bold().FontColor(BrandBlue);
                    img.Item().PaddingTop(6).Border(1).BorderColor(Color.FromHex("#e2e8f0"))
                        .Background(Color.FromHex("#f8fafc")).Padding(6)
                        .MaxHeight(280)
                        .AlignCenter().AlignMiddle()
                        .Image(_extras.PreviewImage)
                        .FitArea();
                });
            }
        });
    }

    /// <summary>
    /// Müşteri raporunda tuval fotoğrafı, matris satırının hemen üstünde, çerçeve içinde.
    /// Izgara şeması ve insan figürü bu raporda yok.
    /// </summary>
    private void ComposeClientVisual(IContainer container)
    {
        if (_extras.PreviewImage is not { Length: > 0 }) return;

        int cols = Math.Max(1, _config.Cols);
        int rows = Math.Max(1, _config.Rows);
        double wM = _config.TotalWidthMm / 1000.0;
        double hM = _config.TotalHeightMm / 1000.0;
        double areaM2 = _config.ScreenAreaM2 > 0
            ? (double)_config.ScreenAreaM2
            : Math.Round(wM * hM, 2);

        container.PaddingBottom(12).ShowEntire().Border(1.5f).BorderColor(BrandBlue)
            .Background(Colors.White).Padding(10).Column(col =>
            {
                col.Item().Text("Yapılandırma görseli").FontSize(12).Bold().FontColor(BrandBlue);
                col.Item().PaddingTop(8).Border(1).BorderColor(Color.FromHex("#e2e8f0"))
                    .Background(Color.FromHex("#f8fafc")).Padding(6)
                    .MaxHeight(220)
                    .AlignCenter().AlignMiddle()
                    .Image(_extras.PreviewImage)
                    .FitArea();
                col.Item().PaddingTop(10).Text("Ekran matrisi").FontSize(8).Bold().FontColor(Colors.Grey.Darken1);
                col.Item().PaddingTop(2).Text($"{cols} × {rows}").FontSize(14).Bold().FontColor(Ink);
                col.Item().PaddingTop(2)
                    .Text($"{wM:F2} × {hM:F2} m  ·  {areaM2:F2} m²")
                    .FontSize(9).FontColor(Colors.Grey.Darken1);
            });
    }

    private static void InfoLine(ColumnDescriptor card, string label, string value)
    {
        card.Item().PaddingTop(8).Row(line =>
        {
            line.RelativeItem().Text(label).FontSize(8).FontColor(Colors.Grey.Darken1);
            line.RelativeItem().AlignRight().Text(value).FontSize(9).Bold();
        });
    }

    /// <summary>
    /// Görselin altındaki ekran türü künyesi. Çizimde L tipi ile düz ekranı
    /// ayıran şey köşedeki kırılma; geniş ve alçak bir şeritte gözden kaçıyor.
    /// Tür burada yazıyla da duruyor — çoklu ekranda her ekran ayrı ayrı.
    /// </summary>
    private void DrawScreenTypeLegend(IContainer container)
    {
        container.PaddingTop(10).Column(col =>
        {
            col.Item().Text("EKRAN TÜRÜ").FontSize(7).Bold().FontColor(Colors.Grey.Darken1);

            if (!string.IsNullOrWhiteSpace(_extras.ScreensSummary))
            {
                // Çoklu ekran: "Ekran 01: 4 Sütun × 3 Satır (İç L Tipi) · Ekran 02: …"
                foreach (var parca in _extras.ScreensSummary.Split('·', StringSplitOptions.RemoveEmptyEntries))
                    col.Item().PaddingTop(2).Text(parca.Trim()).FontSize(9).Bold();
                return;
            }

            col.Item().PaddingTop(2)
                .Text($"{Math.Max(1, _config.Cols)} × {Math.Max(1, _config.Rows)} — {ScreenTypeLabel(_extras.ScreenType)}")
                .FontSize(9).Bold();
        });
    }

    /// <summary>Ölçü hissi veren insan silüetinin gerçek boyu (metre).</summary>
    private const float HumanHeightM = 1.80f;

    /// <summary>Şematik kutusunun toplam yüksekliği (punto).</summary>
    private const float SchematicH = 210f;

    /// <summary>Kutunun kenarlığı + iç payı: ızgara bu kadar içeride başlıyor.</summary>
    private const float SchematicPad = 6.5f;

    private void DrawSchematic(IContainer container)
    {
        int cols = Math.Max(1, _config.Cols);
        int rows = Math.Max(1, _config.Rows);
        int visC = Math.Min(cols, 18);
        int visR = Math.Min(rows, 12);
        bool lshape = string.Equals(_extras.ScreenType, "lshape", StringComparison.OrdinalIgnoreCase);

        // Izgaranın net yüksekliği bu kadar punto ve ekranın TotalHeightM'sine
        // karşılık geliyor → 1 metre = izgaraH / TotalHeightM punto.
        var izgaraH = SchematicH - 2 * SchematicPad;
        var ekranHm = _config.TotalHeightM > 0.05 ? (float)_config.TotalHeightM : HumanHeightM;
        // Ekran insandan kısaysa figür kutuyu taşırmasın diye tavan koyuyoruz.
        var insanH = Math.Min(izgaraH - 12f, izgaraH * HumanHeightM / ekranHm);

        container.Column(col =>
        {
            col.Item().AlignCenter().Text($"{_config.TotalWidthM:F2} m")
                .FontSize(11).Bold().FontColor(BrandBlue);
            col.Item().PaddingTop(6).Height(SchematicH).Row(row =>
            {
                row.RelativeItem().Element(box =>
                {
                    var inner = box.Border(1.5f).BorderColor(BrandBlue)
                        .Background(Color.FromHex("#eef3f9")).Padding(5);
                    if (lshape)
                        DrawLShape(inner, visC, visR);
                    else
                        DrawGrid(inner, visC, visR);
                });
                row.ConstantItem(36).AlignMiddle().AlignCenter()
                    .Text($"{_config.TotalHeightM:F2} m")
                    .FontSize(11).Bold().FontColor(BrandBlue);
                /*
                 * İnsan silüeti ÖLÇEKLİ çizilir: ekranın yüksekliği ızgaranın
                 * yüksekliğine karşılık geldiğine göre, 1,80 m'lik figür de
                 * aynı ölçekte olmalı. Eskiden sabit ~66 punto yüksekliğinde
                 * çiziliyordu; 2 m'lik ekranın yanında da 6 m'lik ekranın
                 * yanında da aynı boyda duruyor, "1.8 m" etiketi gerçeği
                 * söylemiyordu.
                 *
                 * Ayak hizası ızgaranın alt kenarına oturur (PaddingBottom =
                 * kutunun kenarlık + iç payı).
                 */
                row.ConstantItem(Math.Max(42f, insanH * HumanFigWRatio + 6f))
                    .AlignBottom().PaddingBottom(SchematicPad)
                    .Element(c => DrawHuman(c, insanH));
            });
            col.Item().PaddingTop(10).AlignCenter()
                .Text($"{Empty(_config.CabinModelName, "Model")}  ·  {cols} × {rows}  ·  {ScreenTypeLabel(_extras.ScreenType)}")
                .FontSize(9).FontColor(Colors.Grey.Darken1);
        });
    }

    private void DrawGrid(IContainer box, int cols, int rows)
    {
        float cellH = Math.Max(8f, (SchematicH - 2 * SchematicPad - 4f) / Math.Max(1, rows));
        box.Column(col =>
        {
            for (var r = 0; r < rows; r++)
            {
                var captured = r;
                col.Item().Height(cellH).Row(cellRow =>
                {
                    for (var c = 0; c < cols; c++)
                    {
                        cellRow.RelativeItem().Padding(0.6f)
                            .Background(captured % 2 == 0 ? BrandBlue : Color.FromHex("#3d7bc2"))
                            .Border(0.4f).BorderColor(Colors.White);
                    }
                });
            }
        });
    }

    /// <summary>
    /// İç L tipi: iki kanat ortadaki dikişte köşe yapar. Şematikte kanatlar
    /// yan yana, aralarında kalın köşe dikişi ve kanat adlarıyla çizilir.
    /// </summary>
    /// <remarks>
    /// Eskiden sol kanat tek sütuna indiriliyor, sağ kanat yarım yükseklikte
    /// çiziliyor ve araya <c>Extend()</c> konuyordu. Extend, sabit yükseklikli
    /// satırın içinde sınırsız büyüyüp çizimi ikinci bir sayfaya taşırıyordu —
    /// L tipi seçili her raporda fazladan boş sayfa çıkmasının sebebi buydu.
    /// </remarks>
    private void DrawLShape(IContainer box, int cols, int rows)
    {
        int left = Math.Max(1, (int)Math.Ceiling(cols / 2.0));
        int right = Math.Max(1, cols - left);
        box.Row(row =>
        {
            row.RelativeItem(left).Element(b => DrawGrid(b, left, rows));
            row.ConstantItem(4).Background(BrandOrange);
            row.RelativeItem(right).Element(b => DrawGrid(b, right, rows));
        });
    }

    /* Figürün en/boy oranı — ön yüzdeki WallPreview silüetiyle aynı. */
    private const float HumanFigWRatio = 0.43f;

    /// <summary>
    /// 1,80 m'lik figürü verilen puntoluk boyda çizer. Parçaların oranları
    /// (baş · gövde · bacak) sabit; yalnızca ölçek değişir.
    /// </summary>
    private static void DrawHuman(IContainer container, float h)
    {
        /*
         * Parçaların toplamı TAM h olmalı — figürün tepesi ile ayak hizası
         * arası 1,80 m'yi temsil ediyor. Boy etiketi bu yüzden figürün ÜSTÜNE
         * konuyor: sütun alta hizalı olduğu için üstteki fazlalık figürü
         * yukarı itmez, ayaklar ızgaranın alt kenarında kalır. (Etiket altta
         * dururken figürü kendi yüksekliği kadar kısaltmak zorunda kalıyorduk.)
         */
        var bas = h * 0.19f;
        var bosluk = h * 0.03f;
        var govde = h * 0.42f;
        var bacak = h - bas - govde - 2 * bosluk;
        var renk = Color.FromHex("#94a3b8");

        container.Column(c =>
        {
            c.Item().AlignCenter().PaddingBottom(3)
                .Text($"{HumanHeightM:0.00} m").FontSize(7).FontColor(Colors.Grey.Darken1);
            c.Item().AlignCenter().Width(bas).Height(bas).Background(renk);
            c.Item().AlignCenter().PaddingTop(bosluk).Width(bas * 1.3f).Height(govde).Background(renk);
            c.Item().AlignCenter().PaddingTop(bosluk).Width(bas * 0.8f).Height(bacak).Background(renk);
        });
    }

    private void ComposeVisualHeader(IContainer container)
    {
        var size = $"{_config.TotalWidthM:F2} × {_config.TotalHeightM:F2} m";
        container.Column(col =>
        {
            col.Item().Row(row =>
            {
                row.RelativeItem().Text("YAPILANDIRMA GÖRSELİ")
                    .FontSize(11).Bold().FontColor(BrandBlue);
                row.AutoItem().Text($"{Empty(_config.CabinModelName, "")} · {size}")
                    .FontSize(9).FontColor(Colors.Grey.Darken1);
            });
            col.Item().PaddingTop(6).Height(3).Background(BrandBlue);
            col.Item().Height(2).Background(BrandOrange);
        });
    }

    private void ComposeHeader(IContainer container)
    {
        var belgeTarihi = Istanbul( _config.CreatedAt);
        var docNo = belgeTarihi.ToString("yyyyMMdd-HHmm");

        container.Column(col =>
        {
            col.Item().Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("Masaüstü Bilişim Teknolojileri")
                        .FontSize(11).Bold().FontColor(BrandBlue);
                    c.Item().Text("Vision Display Studio")
                        .FontSize(8.5f).FontColor(Colors.Grey.Darken1);
                    c.Item().PaddingTop(6).Text(
                            string.IsNullOrWhiteSpace(_config.ProjectName) ? "LED Ekran Projesi" : _config.ProjectName)
                        .FontSize(16).Bold().FontColor(Ink);
                });

                row.ConstantItem(190).AlignRight().Column(c =>
                {
                    c.Item().Text(_isAdmin ? "İÇ RAPOR — ADMIN" : "MÜŞTERİ RAPORU")
                        .FontSize(9).Bold().FontColor(BrandOrange);
                    c.Item().Text($"Belge No: {docNo}").FontSize(8).FontColor(Colors.Grey.Darken1);
                    c.Item().Text($"Tarih: {belgeTarihi:dd.MM.yyyy HH:mm}")
                        .FontSize(8).FontColor(Colors.Grey.Darken1);
                });
            });

            col.Item().PaddingTop(8).Height(3).Background(BrandBlue);
            col.Item().Height(2).Background(BrandOrange);
        });
    }

    private void ComposeContent(IContainer container)
    {
        int cols = Math.Max(1, _config.Cols);
        int rows = Math.Max(1, _config.Rows);
        int total = cols * rows;
        double wMm = _config.TotalWidthMm;
        double hMm = _config.TotalHeightMm;
        double wM = wMm / 1000.0;
        double hM = hMm / 1000.0;
        double areaM2 = _config.ScreenAreaM2 > 0
            ? (double)_config.ScreenAreaM2
            : Math.Round(wM * hM, 4);
        double viewDist = _cabin != null
            ? (double)ConfigurationCalculator.ViewingDistanceM(_cabin, cols, rows)
            : 0;
        double diag = hMm > 0 ? Math.Round(Math.Sqrt(wMm * wMm + hMm * hMm) / 25.4) : 0;
        decimal maxWatts = _config.MaxGridWatts;
        decimal avgWatts = _config.AvgGridWatts > 0
            ? _config.AvgGridWatts
            : maxWatts * 0.35m;

        long pixels = ParsePixels(_config.TotalResolution, out var mpxText);
        int minPorts = pixels > 0 ? (int)Math.Max(1, Math.Ceiling(pixels / 650000.0)) : Math.Max(1, _config.RequiredRj45Ports);
        int maxPorts = pixels > 0 ? (int)Math.Max(1, Math.Ceiling(pixels / 550000.0)) : minPorts;
        string portText = minPorts == maxPorts ? $"{minPorts} Port" : $"{minPorts} – {maxPorts} Port";
        if (_config.RequiredRj45Ports > 0)
            portText = $"{_config.RequiredRj45Ports} Port ({portText})";

        string dash = "Belirtilmedi";
        string layout = string.Equals(_extras.ScreenMode, "multi", StringComparison.OrdinalIgnoreCase)
            ? "Çoklu ekran"
            : "Tek ekran";

        container.PaddingTop(12).Column(column =>
        {
            if (!_isAdmin && _extras.PreviewImage is { Length: > 0 })
                column.Item().Element(ComposeClientVisual);

            if (_isAdmin && _config.HasUnmetHardwareRequirements)
            {
                column.Item().PaddingBottom(10).Border(1.5f).BorderColor(Color.FromHex("#b45309"))
                    .Background(Color.FromHex("#fffbeb")).Padding(10).Text(
                        FormatAdminUnmetWarning(_config.UnmetHardwareDetails))
                    .FontSize(9).Bold().FontColor(Color.FromHex("#92400e"));
            }
            // ---- 1. TEKLİF / ÖZET ----
            column.Item().Text("Teklif özeti").FontSize(12).Bold().FontColor(BrandBlue);
            column.Item().PaddingTop(6).Table(table =>
            {
                table.ColumnsDefinition(c =>
                {
                    c.RelativeColumn(1);
                    c.RelativeColumn(2);
                    c.RelativeColumn(1);
                    c.RelativeColumn(2);
                });

                Kv(table, "Müşteri", Empty(_config.CustomerName, dash));
                Kv(table, "Telefon", Empty(_extras.Phone, dash));
                Kv(table, "E-posta", Empty(_extras.Email, dash));
                Kv(table, "Adres", Empty(_extras.Address, dash));
                Kv(table, "Model", Empty(_config.CabinModelName, dash));
                Kv(table, "Düzen", layout);
                Kv(table, "Duvar (G × Y)", WallText());
                Kv(table, "Ekran (G × Y)", $"{wM:F2} × {hM:F2} m");
                Kv(table, "Izgara", $"{cols} × {rows}");
                Kv(table, "Sinyal", Empty(_extras.Resolution, dash));
                Kv(table, "Ekran tipi", ScreenTypeLabel(_extras.ScreenType));
                Kv(table, "Montaj", Empty(_config.AssemblyType, dash));
            });

            if (!string.IsNullOrWhiteSpace(_extras.Message))
            {
                column.Item().PaddingTop(6).Text("Mesaj").FontSize(8).FontColor(Colors.Grey.Darken1);
                column.Item().Text(_extras.Message).FontSize(9);
            }

            // Ekran düzeni dökümü ARTIK GÖRSEL SAYFASINDA (bkz.
            // DrawScreenTypeLegend). Çizimin altında dururken okunuyor;
            // burada ayrıca yazınca hem tekrar oluyor hem de teknik tabloyu
            // üçüncü sayfaya itiyordu.

            column.Item().PaddingTop(8).Background(Color.FromHex("#f5f7fb")).Border(1).BorderColor(Color.FromHex("#e2e8f0")).Padding(8).Row(row =>
            {
                Summary(row, "EKRAN (G × Y)", $"{wM:F2} × {hM:F2} m", $"{areaM2:F2} m²");
                Summary(row, "ALAN / ORAN", $"{areaM2:F2} m²", Empty(_config.AspectRatio, "—"));
                Summary(row, "ÇÖZÜNÜRLÜK", ResolutionTag(), $"{_config.TotalResolution} piksel{mpxText}");
                Summary(row, "İZLEME MESAFESİ", $"{viewDist:F1} m", "önerilen");
            });

            // Başlık ile tablo aynı blokta kalır; başlık sayfa sonunda yalnız kalmaz.
            column.Item().PaddingTop(12).ShowEntire().Column(tech =>
            {
            tech.Item().Text("Teknik özellikler").FontSize(12).Bold().FontColor(BrandBlue);
            tech.Item().PaddingTop(5).Table(table =>
            {
                table.ColumnsDefinition(c =>
                {
                    c.RelativeColumn(2);
                    c.RelativeColumn(3);
                });

                table.Header(h =>
                {
                    h.Cell().Background(BrandBlue).Padding(6).Text("Parametre").FontColor(Colors.White).Bold().FontSize(9);
                    h.Cell().Background(BrandBlue).Padding(6).AlignRight().Text("Değer").FontColor(Colors.White).Bold().FontSize(9);
                });

                bool alt = true;
                AddRow(table, "Kabin / panel modeli", Empty(_config.CabinModelName, "Standart"), ref alt);
                if (_cabin != null)
                {
                    AddRow(table, "Piksel aralığı", FormatPitch(_cabin.PixelPitchMm), ref alt);
                    AddRow(table, "Parlaklık", $"{_cabin.BrightnessNits:N0} nit", ref alt);
                    if (_cabin.RefreshRateHz > 0)
                        AddRow(table, "Yenileme hızı", $"{_cabin.RefreshRateHz} Hz", ref alt);
                }

                AddRow(table, "Fiziksel ölçüler (G × Y)", $"{wMm:N0} mm × {hMm:N0} mm ({wM:F2} m × {hM:F2} m)", ref alt);
                AddRow(table, "Toplam ekran alanı", $"{areaM2:F2} m²", ref alt);
                AddRow(table, "En-boy oranı", Empty(_config.AspectRatio, "—"), ref alt);
                AddRow(table, "Köşegen", $"{diag:F0}\"", ref alt);
                AddRow(table, "Toplam çözünürlük", $"{_config.TotalResolution} piksel{mpxText}", ref alt);
                if (viewDist > 0)
                    AddRow(table, "Önerilen izleme mesafesi", $"{viewDist:F1} m", ref alt);
                AddRow(table, "Ünite adedi & matris", $"{total} adet ({cols} × {rows})", ref alt);
                if (_isAdmin)
                {
                    AddRow(table, "Alıcı kart (adet)", $"{_config.ReceivingCardCount}", ref alt);
                    AddRow(table, "Gerekli RJ45 Ethernet portu", portText, ref alt);
                    AddRow(table, "Tavsiye işlemci", Empty(_config.RecommendedProcessor, "—"), ref alt);
                    AddRow(table, "Tavsiye medya oynatıcı", _config.HasMiniPc
                        ? Empty(_config.HardwareBreakdown.FirstOrDefault(x => x.Key == "miniPc" && x.Quantity > 0)?.Name, "Mini PC")
                        : "İşlemci üzerinden", ref alt);
                }
                AddRow(table, "Tahmini toplam ağırlık", $"{_config.TotalWeightKg:N1} kg", ref alt);
                if (_isAdmin)
                {
                    AddRow(table, "Maksimum güç", PowerPair(maxWatts), ref alt);
                    AddRow(table, "Ortalama / tipik güç", PowerPair(avgWatts), ref alt);
                    AddRow(table, "Maksimum ısı", BtuText(maxWatts), ref alt);
                    AddRow(table, "Ortalama ısı", BtuText(avgWatts), ref alt);
                }

                if (_isAdmin && _cabin != null)
                {
                    if (!string.IsNullOrWhiteSpace(_cabin.SboxCode))
                        AddRow(table, "S-Kutu", _cabin.SboxCode, ref alt);
                    if (!string.IsNullOrWhiteSpace(_cabin.JigCode))
                        AddRow(table, "Jig", _cabin.JigCode, ref alt);
                    if (!string.IsNullOrWhiteSpace(_cabin.PowerCord110Code))
                        AddRow(table, "Güç kablosu 110V", _cabin.PowerCord110Code, ref alt);
                    if (!string.IsNullOrWhiteSpace(_cabin.PowerCord220Code))
                        AddRow(table, "Güç kablosu 220V", _cabin.PowerCord220Code, ref alt);
                }
            });

            tech.Item().PaddingTop(10).Column(c =>
            {
                c.Item().Text("* Değerler teorik fabrika verilerine dayanır; sahada farklılık gösterebilir.").FontSize(7.5f).Italic().FontColor(Colors.Grey.Medium);
                if (_isAdmin)
                {
                    c.Item().Text("* RJ45 adedi, seçilen işlemcinin port başı piksel kapasitesi ile port en ve boy sınırından gelir.").FontSize(7.5f).Italic().FontColor(Colors.Grey.Medium);
                    c.Item().Text("* Isı: 1 W = 3,412 BTU/saat. Toplam ısı ham wattan bir kez hesaplanır. Modül satırı bu toplama eklenmez.").FontSize(7.5f).Italic().FontColor(Colors.Grey.Medium);
                }
            });
            });

            if (_isAdmin)
            {
                column.Item().Element(c => ComposeEnergy(c, areaM2, total));
                column.Item().Element(c => ComposeAdminHardware(c, areaM2, maxWatts, avgWatts));
            }
            else
            {
                column.Item().Element(ComposeClientTotalPrice);
            }

            if (_isAdmin)
                column.Item().PaddingTop(16).Element(ComposeScreenVisual);
        });
    }

    /// <summary>
    /// Günlük kWh = m² × (W/m²) × saat / 1000.
    /// Tutar = kWh × 3,92 ₺. Yıllık = aylık × 12.
    /// </summary>
    private void ComposeEnergy(IContainer container, double areaM2, int panelCount)
    {
        const decimal hours = LedEnergyCalculator.DefaultDailyHours;
        const int days = LedEnergyCalculator.DefaultDaysPerMonth;
        decimal avgWatts = _config.AvgGridWatts > 0
            ? _config.AvgGridWatts
            : _config.MaxGridWatts;
        if (avgWatts <= 0 || areaM2 <= 0 || panelCount <= 0) return;

        decimal wattsPerM2 = Math.Round(avgWatts / (decimal)areaM2, 2, MidpointRounding.AwayFromZero);
        decimal squareMeters = Math.Round((decimal)areaM2, 2, MidpointRounding.AwayFromZero);
        string panelType = _cabin is { PixelPitchMm: > 0 }
            ? FormatPitch(_cabin.PixelPitchMm)
            : Empty(_config.CabinModelName, "LED");

        LedEnergyResult energy;
        try
        {
            energy = LedEnergyCalculator.Calculate(new LedEnergyInput
            {
                PanelType = panelType,
                PanelCount = panelCount,
                DailyHours = hours,
                DaysPerMonth = days,
                WattsPerSquareMeter = wattsPerM2,
                TotalSquareMeters = squareMeters,
                PricePerKwh = LedEnergyCalculator.DefaultPricePerKwh,
            });
        }
        catch (LedEnergyValidationException)
        {
            return;
        }

        container.ShowEntire().PaddingTop(12).Column(column =>
        {
            column.Item().Text("LED enerji tüketimi").FontSize(12).Bold().FontColor(BrandBlue);
            column.Item().PaddingTop(5).Table(table =>
            {
                table.ColumnsDefinition(c =>
                {
                    c.RelativeColumn(2);
                    c.RelativeColumn(3);
                });

                bool alt = true;
                AddRow(table, "Panel tipi", energy.PanelType, ref alt);
                AddRow(table, "Panel sayısı", $"{energy.PanelCount} adet", ref alt);
                AddRow(table, "Toplam LED alanı", $"{energy.TotalSquareMeters.ToString("N2", Tr)} m²", ref alt);
                AddRow(table, "1 m² saatlik tüketim", $"{energy.WattsPerSquareMeter.ToString("N2", Tr)} W", ref alt);
                AddRow(table, "Günlük çalışma", $"{energy.DailyHours.ToString("0", Tr)} saat", ref alt);
                AddRow(table, "Günlük tüketim", $"{energy.DailyKwh.ToString("N2", Tr)} kWh", ref alt);
                AddRow(table, "Aylık tüketim", $"{energy.MonthlyKwh.ToString("N2", Tr)} kWh ({energy.DaysPerMonth} gün)", ref alt);
                AddRow(table, "Saatlik elektrik birim fiyatı", $"{energy.PricePerKwh.ToString("N2", Tr)} ₺/kWh", ref alt);
                AddRow(table, "Günlük toplam enerji maliyeti", $"{energy.DailyCostTry.ToString("N2", Tr)} ₺", ref alt);
                AddRow(table, "Aylık toplam enerji maliyeti", $"{energy.MonthlyCostTry.ToString("N2", Tr)} ₺", ref alt);
                AddRow(table, "Yıllık tahmini enerji maliyeti", $"{energy.YearlyCostTry.ToString("N2", Tr)} ₺", ref alt);
            });
            column.Item().PaddingTop(4).Text(
                    "Varsayılan: günde 12 saat, ayda 30 gün, 3,92 ₺/kWh. Tüketim tipik güçten hesaplanır. Yıllık tutar, aylık tutarın 12 katıdır.")
                .FontSize(7.5f).Italic().FontColor(Colors.Grey.Medium);
        });
    }

    /// <summary>
    /// Müşteri raporunda eşleşen katalog kalemleri (adet; birim fiyat yok).
    /// Eksik parça uyarısı buraya yazılmaz.
    /// </summary>
    private void ComposeClientPackage(IContainer container)
    {
        var lines = _config.HardwareBreakdown.ToList();
        if (lines.Count == 0) return;

        container.PaddingTop(14).Column(column =>
        {
            column.Item().Text("Paket içeriği").FontSize(12).Bold().FontColor(BrandBlue);
            column.Item().PaddingTop(5).Table(table =>
            {
                table.ColumnsDefinition(c =>
                {
                    c.RelativeColumn(1.6f);
                    c.RelativeColumn(2.4f);
                    c.RelativeColumn(0.8f);
                });

                table.Header(h =>
                {
                    h.Cell().Background(BrandBlue).Padding(6).Text("Kalem").FontColor(Colors.White).Bold().FontSize(8);
                    h.Cell().Background(BrandBlue).Padding(6).Text("Ürün").FontColor(Colors.White).Bold().FontSize(8);
                    h.Cell().Background(BrandBlue).Padding(6).Text("Adet").FontColor(Colors.White).Bold().FontSize(8);
                });

                bool alt = true;
                foreach (var line in lines)
                {
                    var bg = alt ? Color.FromHex("#f8fafc") : Colors.White;
                    alt = !alt;
                    table.Cell().Background(bg).BorderBottom(1).BorderColor(Color.FromHex("#e2e8f0"))
                        .PaddingVertical(2.6f).PaddingHorizontal(4).Text(HardwareLabel(line.Key)).FontSize(8);
                    table.Cell().Background(bg).BorderBottom(1).BorderColor(Color.FromHex("#e2e8f0"))
                        .PaddingVertical(2.6f).PaddingHorizontal(4).Text(line.Name).FontSize(8);
                    table.Cell().Background(bg).BorderBottom(1).BorderColor(Color.FromHex("#e2e8f0"))
                        .PaddingVertical(2.6f).PaddingHorizontal(4).AlignRight().Text($"{line.Quantity}").Bold().FontSize(8);
                }
            });
        });
    }
    private void ComposeClientTotalPrice(IContainer container)
    {
        container.PaddingTop(14).Border(1.5f).BorderColor(BrandBlue)
            .Background(Color.FromHex("#eef3f9")).Padding(12).Row(row =>
            {
                row.RelativeItem().AlignMiddle().Column(c =>
                {
                    c.Item().Text("NİHAİ TOPLAM SATIŞ FİYATI")
                        .FontSize(8).Bold().FontColor(Colors.Grey.Darken1);
                    c.Item().PaddingTop(2).Text("Total Amount / Price")
                        .FontSize(7.5f).FontColor(Colors.Grey.Medium);
                });
                row.AutoItem().AlignRight().AlignMiddle()
                    .Text($"${_config.TotalPrice:N2}")
                    .FontSize(20).Bold().FontColor(BrandBlue);
            });
    }

    private void ComposeAdminHardware(IContainer container, double areaM2, decimal maxWatts, decimal avgWatts)
    {
        container.PaddingTop(14).Column(column =>
        {
            column.Item().ShowEntire().Column(block =>
            {
            block.Item().Text("Donanım dökümü (iç)").FontSize(12).Bold().FontColor(BrandBlue);
            block.Item().PaddingTop(5).Table(table =>
            {
                table.ColumnsDefinition(c =>
                {
                    c.RelativeColumn(1.4f);
                    c.RelativeColumn(2.2f);
                    c.RelativeColumn(0.7f);
                    c.RelativeColumn(1.1f);
                    c.RelativeColumn(1.1f);
                });

                table.Header(h =>
                {
                    h.Cell().Background(BrandBlue).Padding(6).Text("Kalem").FontColor(Colors.White).Bold().FontSize(8);
                    h.Cell().Background(BrandBlue).Padding(6).Text("Marka / Model").FontColor(Colors.White).Bold().FontSize(8);
                    h.Cell().Background(BrandBlue).Padding(6).Text("Adet").FontColor(Colors.White).Bold().FontSize(8);
                    h.Cell().Background(BrandBlue).Padding(6).Text("Birim ($)").FontColor(Colors.White).Bold().FontSize(8);
                    h.Cell().Background(BrandBlue).Padding(6).Text("Toplam ($)").FontColor(Colors.White).Bold().FontSize(8);
                });

                bool alt = true;
                foreach (var line in _config.HardwareBreakdown)
                {
                    AddMoneyRow(table, HardwareLabel(line.Key), line.Name, line.Quantity, line.UnitPrice, line.LineTotal, ref alt);
                }

                if (!_config.HardwareBreakdown.Any(x => x.Quantity > 0))
                {
                    var bg = Color.FromHex("#f8fafc");
                    table.Cell().ColumnSpan(5).Background(bg).Padding(6)
                        .Text("Donanım kalemleri hesaplanamadı (katalog seçilmemiş olabilir).").FontSize(8).FontColor(Colors.Grey.Darken1);
                }
            });
            });

            column.Item().PaddingTop(10).ShowEntire().Column(block =>
            {
            block.Item().Text("İşçilik ve satış fiyatı").FontSize(12).Bold().FontColor(BrandBlue);
            block.Item().PaddingTop(5).Table(table =>
            {
                table.ColumnsDefinition(c =>
                {
                    c.RelativeColumn(2);
                    c.RelativeColumn(3);
                });

                bool alt = true;
                AddRow(table, "Ekran alanı", $"{areaM2:F2} m²", ref alt);
                AddRow(table, "İşçilik çarpanı", $"${_config.LaborCostMultiplier:N2} / m²", ref alt);
                AddRow(table, "İşçilik formülü", "Ekran Alanı x İşçilik Çarpanı", ref alt);
                AddRow(table, "İşçilik hesabı", $"{areaM2:F2} m² x ${_config.LaborCostMultiplier:N2}", ref alt);
                AddRow(table, "İşçilik tutarı", $"${_config.LaborCost:N2}", ref alt);
                AddRow(table, "Donanım ara toplamı", $"${_config.HardwareSubtotal:N2}", ref alt);
                AddRow(table, "Nihai satış fiyatı", $"${_config.TotalPrice:N2}", ref alt);
            });

            block.Item().PaddingTop(8).AlignRight().Border(1).BorderColor(Color.FromHex("#e2e8f0")).Background(Color.FromHex("#f5f7fb")).Padding(8).Column(c =>
            {
                c.Item().Text("Nihai toplam satış fiyatı").FontSize(8).FontColor(Colors.Grey.Darken1);
                c.Item().Text($"${_config.TotalPrice:N2}").FontSize(16).Bold().FontColor(BrandBlue);
            });
            });

            column.Item().PaddingTop(12).ShowEntire().Column(block =>
            {
            block.Item().Text("Güç ve ısı (iç)").FontSize(12).Bold().FontColor(BrandBlue);
            block.Item().PaddingTop(5).Table(table =>
            {
                table.ColumnsDefinition(c =>
                {
                    c.RelativeColumn(2);
                    c.RelativeColumn(3);
                });

                table.Header(h =>
                {
                    h.Cell().Background(BrandBlue).Padding(6).Text("Parametre").FontColor(Colors.White).Bold().FontSize(9);
                    h.Cell().Background(BrandBlue).Padding(6).AlignRight().Text("Değer").FontColor(Colors.White).Bold().FontSize(9);
                });

                bool alt = true;
                var eta = _config.PsuEfficiencyRatio is > 0 ? _config.PsuEfficiencyRatio.Value : 1m;
                var supply = PowerHeatMath.RecommendSupply(maxWatts);
                decimal maxBtu = maxWatts * ConfigurationCalculator.WattsToBtu;
                string phaseVolt = supply.ThreePhase ? "3 faz, 380 V" : "tek faz, 220 V";
                AddRow(table, "Güç kaynağı verim oranı", $"{eta:P1} ({eta:N4})", ref alt);
                AddRow(table, "Maksimum güç tüketimi", PowerPair(maxWatts), ref alt);
                AddRow(table, "Tipik güç tüketimi", PowerPair(avgWatts), ref alt);
                AddRow(table, "Maksimum ısı yayılımı", BtuText(maxWatts), ref alt);
                AddRow(table, "Tipik ısı yayılımı", BtuText(avgWatts), ref alt);
                AddRow(table, "Modül ısı yayılımı (bilgi)", $"{_config.ModuleHeatDissipationBtu.ToString("N1", Tr)} BTU", ref alt);
                AddRow(table, "Maksimum çekilen akım", $"{supply.CurrentAmps.ToString("N2", Tr)} A ({phaseVolt})", ref alt);
                AddRow(table, "Önerilen sigorta", supply.Label, ref alt);
                AddRow(table, "Gerekli soğutma kapasitesi", $"{PowerHeatMath.CoolingTons(maxBtu).ToString("N2", Tr)} ton", ref alt);
                AddRow(table, "Gerekli soğutma gücü", $"{PowerHeatMath.CoolingKw(maxBtu).ToString("N2", Tr)} kW", ref alt);
            });
            block.Item().PaddingTop(4).Text(
                    "Akım = watt / (volt × 0,95). Sigorta = akım × 1,25, yukarı yönde en yakın C tipi. Tek faz 32 A’yı aşarsa 3 faz 380 V kullanılır. Klima tonu = maksimum BTU / 12.000. Soğutma kW = maksimum BTU / 3,412 / 1.000. Modül ısı satırı toplama eklenmez.")
                .FontSize(7.5f).Italic().FontColor(Colors.Grey.Medium);
            });
        });
    }

    private static void AddMoneyRow(
        TableDescriptor table,
        string kalem,
        string model,
        int qty,
        decimal unit,
        decimal total,
        ref bool isAlternate)
    {
        var bg = isAlternate ? Color.FromHex("#f8fafc") : Colors.White;
        isAlternate = !isAlternate;
        table.Cell().Background(bg).BorderBottom(1).BorderColor(Color.FromHex("#e2e8f0")).PaddingVertical(2.6f).PaddingHorizontal(4).Text(kalem).FontSize(8);
        table.Cell().Background(bg).BorderBottom(1).BorderColor(Color.FromHex("#e2e8f0")).PaddingVertical(2.6f).PaddingHorizontal(4).Text(model).FontSize(8);
        table.Cell().Background(bg).BorderBottom(1).BorderColor(Color.FromHex("#e2e8f0")).PaddingVertical(2.6f).PaddingHorizontal(4).AlignRight().Text($"{qty}").Bold().FontSize(8);
        table.Cell().Background(bg).BorderBottom(1).BorderColor(Color.FromHex("#e2e8f0")).PaddingVertical(2.6f).PaddingHorizontal(4).AlignRight().Text($"{unit:N2}").FontSize(8);
        table.Cell().Background(bg).BorderBottom(1).BorderColor(Color.FromHex("#e2e8f0")).PaddingVertical(2.6f).PaddingHorizontal(4).AlignRight().Text($"{total:N2}").Bold().FontSize(8);
    }

    private static string HardwareLabel(string key) => key switch
    {
        "module" => "Modül / Kabin",
        "processor" => "İşlemci",
        "powerSupply" => "Güç Kaynağı",
        "miniPc" => "Mini PC",
        "patchCable" => "Patch Kablosu",
        "receivingCard" => "Alıcı Kart",
        _ => key,
    };

    private string WallText()
    {
        if (_extras.WallWidthM is > 0 && _extras.WallHeightM is > 0)
            return $"{_extras.WallWidthM:F2} × {_extras.WallHeightM:F2} m";
        return "Belirtilmedi";
    }

    private string ResolutionTag() =>
        _config.Is4K ? "4K Ultra HD" : (_config.IsFullHd ? "Full HD" : "Özel");

    private static string PowerPair(decimal watts) =>
        $"{watts.ToString("N2", Tr)} W ({(watts / 1000m).ToString("N2", Tr)} kW)";

    private static string BtuText(decimal watts) =>
        $"{PowerHeatMath.RoundBtu(watts).ToString("N0", Tr)} BTU/saat";

    private static readonly CultureInfo Tr = CultureInfo.GetCultureInfo("tr-TR");

    /// <summary>2,5 mm → P2.5 mm. Nokta kültürden bağımsızdır.</summary>
    private static string FormatPitch(decimal pitchMm)
    {
        var text = pitchMm.ToString("0.##", CultureInfo.InvariantCulture);
        return $"P{text} mm";
    }

    private static string ScreenTypeLabel(string? type) => type switch
    {
        "flat" => "Düz",
        "concave" or "curvedIn" => "İçbükey",
        "convex" or "curved" => "Dışbükey",
        "lshape" => "L tipi",
        _ => string.IsNullOrWhiteSpace(type) ? "Belirtilmedi" : type,
    };

    private static DateTime Istanbul(DateTime value)
    {
        TimeZoneInfo zone;
        try
        {
            zone = TimeZoneInfo.FindSystemTimeZoneById("Europe/Istanbul");
        }
        catch (TimeZoneNotFoundException)
        {
            zone = TimeZoneInfo.FindSystemTimeZoneById("Turkey Standard Time");
        }

        var utc = value == default
            ? DateTime.UtcNow
            : value.Kind == DateTimeKind.Local
                ? value.ToUniversalTime()
                : DateTime.SpecifyKind(value, DateTimeKind.Utc);
        return TimeZoneInfo.ConvertTimeFromUtc(utc, zone);
    }

    private static string Empty(string? v, string fallback) =>
        string.IsNullOrWhiteSpace(v) ? fallback : v;

    private static void Summary(RowDescriptor row, string k, string v, string sub)
    {
        row.RelativeItem().Column(c =>
        {
            c.Item().Text(k).FontSize(7).Bold().FontColor(Colors.Grey.Darken1);
            c.Item().Text(v).Bold().FontSize(10);
            c.Item().Text(sub).FontSize(7.5f).FontColor(Colors.Grey.Medium);
        });
    }

    private static void Kv(TableDescriptor table, string k, string v)
    {
        table.Cell().PaddingVertical(2).PaddingRight(6).Text(k).FontSize(8).FontColor(Colors.Grey.Darken1);
        table.Cell().PaddingVertical(2).Text(v).FontSize(8.5f).Bold();
    }

    private static void AddRow(TableDescriptor table, string label, string value, ref bool isAlternate)
    {
        var bg = isAlternate ? Color.FromHex("#f8fafc") : Colors.White;
        isAlternate = !isAlternate;
        table.Cell().Background(bg).BorderBottom(1).BorderColor(Color.FromHex("#e2e8f0")).PaddingVertical(2.6f).PaddingHorizontal(5).Text(label).FontSize(8.5f);
        table.Cell().Background(bg).BorderBottom(1).BorderColor(Color.FromHex("#e2e8f0")).PaddingVertical(2.6f).PaddingHorizontal(5).AlignRight().Text(value).Bold().FontSize(9);
    }

    private static long ParsePixels(string? resolution, out string mpxText)
    {
        mpxText = "";
        if (string.IsNullOrEmpty(resolution) || !resolution.Contains('x'))
            return 0;
        var parts = resolution.ToLowerInvariant().Replace(" ", "").Split('x');
        if (parts.Length == 2 && long.TryParse(parts[0], out var w) && long.TryParse(parts[1], out var h))
        {
            var px = w * h;
            mpxText = $" ({px / 1_000_000.0:F2} milyon piksel)";
            return px;
        }
        return 0;
    }

    private void ComposeFooter(IContainer container)
    {
        container.Column(col =>
        {
            if (_isAdmin && _extras.UsdTryRate is > 0)
            {
                col.Item().PaddingBottom(3).Text(
                        $"*Hesaplamalarda kullanılan TCMB Dolar Kuru: 1 USD = {_extras.UsdTryRate.Value.ToString("0.00", CultureInfo.InvariantCulture)} TL")
                    .FontSize(7.5f).Italic().FontColor(Colors.Grey.Darken1);
            }
            col.Item().LineHorizontal(0.5f).LineColor(Color.FromHex("#e2e8f0"));
            col.Item().PaddingTop(4).Row(row =>
            {
                row.RelativeItem().Text(_isAdmin
                        ? "Masaüstü Bilişim Teknolojileri — Vision Display Studio. İÇ RAPOR — fiyat ve donanım dökümü müşteri belgesinde yer almaz."
                        : "Masaüstü Bilişim Teknolojileri — Vision Display Studio. Müşteri raporu — paket içeriği ve nihai toplam satış fiyatı içerir.")
                    .FontSize(7.5f).FontColor(Colors.Grey.Medium);
                row.ConstantItem(70).AlignRight().Text(t =>
                {
                    t.Span("Sayfa ").FontSize(7.5f).FontColor(Colors.Grey.Medium);
                    t.CurrentPageNumber().FontSize(7.5f).FontColor(Colors.Grey.Medium);
                    t.Span(" / ").FontSize(7.5f).FontColor(Colors.Grey.Medium);
                    t.TotalPages().FontSize(7.5f).FontColor(Colors.Grey.Medium);
                });
            });
        });
    }
}
