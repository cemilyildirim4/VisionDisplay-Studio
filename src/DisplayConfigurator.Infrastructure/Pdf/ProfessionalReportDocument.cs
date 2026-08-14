using DisplayConfigurator.Application.DTOs;
using DisplayConfigurator.Domain.Entities;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace DisplayConfigurator.Infrastructure.Pdf;

/// <summary>
/// Tek profesyonel rapor: üstte teklif/özet, altta teknik özellikler tablosu.
/// </summary>
public class ProfessionalReportDocument : IDocument
{
    private static readonly Color BrandBlue = Color.FromHex("#2962ad");
    private static readonly Color BrandOrange = Color.FromHex("#f37021");
    private static readonly Color Ink = Color.FromHex("#1c1c2b");

    private readonly ConfigurationResponseDto _config;
    private readonly PdfReportExtras _extras;
    private readonly Cabin? _cabin;

    public ProfessionalReportDocument(
        ConfigurationResponseDto config,
        PdfReportExtras? extras = null,
        Cabin? cabin = null)
    {
        _config = config;
        _extras = extras ?? new PdfReportExtras();
        _cabin = cabin;
    }

    public DocumentMetadata GetMetadata() => DocumentMetadata.Default;

    public void Compose(IDocumentContainer container)
    {
        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(1.4f, Unit.Centimetre);
            page.PageColor(Colors.White);
            page.DefaultTextStyle(x => x.FontSize(9.5f).FontFamily("Arial").FontColor(Ink));

            page.Header().Element(ComposeHeader);
            page.Content().Element(ComposeContent);
            page.Footer().Element(ComposeFooter);
        });

        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(1.4f, Unit.Centimetre);
            page.PageColor(Colors.White);
            page.DefaultTextStyle(x => x.FontSize(9.5f).FontFamily("Arial").FontColor(Ink));

            page.Header().Element(ComposeVisualHeader);
            page.Content().Element(ComposeScreenVisual);
            page.Footer().Element(ComposeFooter);
        });
    }

    private void ComposeScreenVisual(IContainer container)
    {
        if (_extras.PreviewImage is { Length: > 0 })
        {
            container.Column(col =>
            {
                col.Item().AlignCenter().AlignMiddle()
                    .Image(_extras.PreviewImage)
                    .FitArea();
                col.Item().Element(DrawScreenTypeLegend);
            });
            return;
        }

        container.Column(col =>
        {
            col.Item().AlignCenter().AlignMiddle().Element(DrawSchematic);
            col.Item().Element(DrawScreenTypeLegend);
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

    private void DrawSchematic(IContainer container)
    {
        int cols = Math.Max(1, _config.Cols);
        int rows = Math.Max(1, _config.Rows);
        int visC = Math.Min(cols, 18);
        int visR = Math.Min(rows, 12);
        bool lshape = string.Equals(_extras.ScreenType, "lshape", StringComparison.OrdinalIgnoreCase);

        container.Column(col =>
        {
            col.Item().AlignCenter().Text($"{_config.TotalWidthM:F2} m")
                .FontSize(11).Bold().FontColor(BrandBlue);
            col.Item().PaddingTop(6).Height(320).Row(row =>
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
                row.ConstantItem(42).AlignBottom().PaddingBottom(12).Element(DrawHuman);
            });
            col.Item().PaddingTop(10).AlignCenter()
                .Text($"{Empty(_config.CabinModelName, "Model")}  ·  {cols} × {rows}  ·  {ScreenTypeLabel(_extras.ScreenType)}")
                .FontSize(9).FontColor(Colors.Grey.Darken1);
        });
    }

    private void DrawGrid(IContainer box, int cols, int rows)
    {
        box.Column(col =>
        {
            for (var r = 0; r < rows; r++)
            {
                var captured = r;
                col.Item().Row(cellRow =>
                {
                    for (var c = 0; c < cols; c++)
                    {
                        cellRow.RelativeItem().Padding(0.5f)
                            .Background(captured % 2 == 0 ? BrandBlue : Color.FromHex("#3d7bc2"))
                            .Border(0.4f).BorderColor(Colors.White)
                            .MinHeight(14);
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

    private static void DrawHuman(IContainer container)
    {
        container.Column(c =>
        {
            c.Item().AlignCenter().Width(12).Height(12).Background(Color.FromHex("#94a3b8"));
            c.Item().AlignCenter().PaddingTop(2).Width(16).Height(28).Background(Color.FromHex("#94a3b8"));
            c.Item().AlignCenter().PaddingTop(2).Width(10).Height(22).Background(Color.FromHex("#94a3b8"));
            c.Item().AlignCenter().PaddingTop(4).Text("1.8 m").FontSize(7).FontColor(Colors.Grey.Darken1);
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
        var docNo = _config.CreatedAt == default
            ? DateTime.UtcNow.ToString("yyyyMMdd-HHmm")
            : _config.CreatedAt.ToString("yyyyMMdd-HHmm");

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
                    c.Item().Text("PROFESYONEL PDF RAPORU")
                        .FontSize(9).Bold().FontColor(BrandOrange);
                    c.Item().Text($"Belge No: {docNo}").FontSize(8).FontColor(Colors.Grey.Darken1);
                    c.Item().Text($"Tarih: {(_config.CreatedAt == default ? DateTime.Now : _config.CreatedAt):dd.MM.yyyy HH:mm}")
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
        double diag = hMm > 0 ? Math.Round(Math.Sqrt(wMm * wMm + hMm * hMm) / 25.4) : 0;
        double maxW = (double)_config.TotalMaxPowerKw * 1000.0;
        double avgW = _config.TotalAvgPowerKw > 0
            ? (double)_config.TotalAvgPowerKw * 1000.0
            : Math.Round(maxW / 3.0);
        double maxBtu = Math.Round(maxW * 3.412142);
        double avgBtu = Math.Round(avgW * 3.412142);

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
                Summary(row, "EKRAN DÜZENİ", $"{cols} Sütun × {rows} Satır", $"Toplam {total} ünite");
                Summary(row, "KÖŞEGEN", $"{diag:F0}\"", Empty(_config.AspectRatio, "—"));
                Summary(row, "ÇÖZÜNÜRLÜK", ResolutionTag(), $"{_config.TotalResolution} px{mpxText}");
                Summary(row, "AĞIRLIK / GÜÇ", $"{_config.TotalWeightKg:N1} kg", $"{maxW:N0} W max");
            });

            // ---- 2. TEKNİK TABLO ----
            column.Item().PaddingTop(12).Text("Teknik özellikler").FontSize(12).Bold().FontColor(BrandBlue);
            column.Item().PaddingTop(5).Table(table =>
            {
                table.ColumnsDefinition(c =>
                {
                    c.RelativeColumn(2);
                    c.RelativeColumn(3);
                });

                table.Header(h =>
                {
                    h.Cell().Background(BrandBlue).Padding(6).Text("Parametre").FontColor(Colors.White).Bold().FontSize(9);
                    h.Cell().Background(BrandBlue).Padding(6).Text("Değer").FontColor(Colors.White).Bold().FontSize(9);
                });

                bool alt = true;
                AddRow(table, "Kabin / panel modeli", Empty(_config.CabinModelName, "Standart"), ref alt);
                if (_cabin != null)
                {
                    AddRow(table, "Piksel aralığı", $"{_cabin.PixelPitchMm} mm", ref alt);
                    AddRow(table, "Parlaklık", $"{_cabin.BrightnessNits:N0} nit", ref alt);
                    if (_cabin.RefreshRateHz > 0)
                        AddRow(table, "Yenileme hızı", $"{_cabin.RefreshRateHz} Hz", ref alt);
                }

                AddRow(table, "Fiziksel ölçüler (G × Y)", $"{wMm:N0} mm × {hMm:N0} mm ({wM:F2} m × {hM:F2} m)", ref alt);
                AddRow(table, "Köşegen", $"{diag:F0}\"", ref alt);
                AddRow(table, "Toplam çözünürlük", $"{_config.TotalResolution} px{mpxText}", ref alt);
                AddRow(table, "Ünite adedi & matris", $"{total} adet ({cols} × {rows})", ref alt);
                AddRow(table, "Alıcı kart", $"{_config.ReceivingCardCount}", ref alt);
                AddRow(table, "Gerekli RJ45 Ethernet portu", portText, ref alt);
                AddRow(table, "Tavsiye işlemci", Empty(_config.RecommendedProcessor, MediaBox(pixels, minPorts)), ref alt);
                AddRow(table, "Tavsiye medya oynatıcı", MediaBox(pixels, minPorts), ref alt);
                AddRow(table, "Tahmini toplam ağırlık", $"{_config.TotalWeightKg:N1} kg", ref alt);
                AddRow(table, "Maksimum güç", $"{_config.TotalMaxPowerKw:F2} kW ({maxW:N0} W)", ref alt);
                AddRow(table, "Ortalama / tipik güç", $"{avgW / 1000.0:F2} kW ({avgW:N0} W)", ref alt);
                AddRow(table, "Maksimum ısı", $"{maxBtu:N0} BTU/hr", ref alt);
                AddRow(table, "Ortalama ısı", $"{avgBtu:N0} BTU/hr", ref alt);

                if (_cabin != null)
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

            column.Item().PaddingTop(10).Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("* Değerler teorik fabrika verilerine dayanır; sahada farklılık gösterebilir.").FontSize(7.5f).Italic().FontColor(Colors.Grey.Medium);
                    c.Item().Text("* RJ45 port ihtiyacı port başına en fazla 650.000 piksel sınırına göredir.").FontSize(7.5f).Italic().FontColor(Colors.Grey.Medium);
                    c.Item().Text("* Isı: 1 W = 3.412142 BTU/hr.").FontSize(7.5f).Italic().FontColor(Colors.Grey.Medium);
                });

                row.ConstantItem(175).AlignRight().Border(1).BorderColor(Color.FromHex("#e2e8f0")).Background(Color.FromHex("#f5f7fb")).Padding(8).Column(c =>
                {
                    c.Item().Text("Tahmini toplam fiyat").FontSize(8).FontColor(Colors.Grey.Darken1);
                    c.Item().Text($"${_config.TotalPrice:N2}").FontSize(16).Bold().FontColor(BrandBlue);
                });
            });
        });
    }

    private string WallText()
    {
        if (_extras.WallWidthM is > 0 && _extras.WallHeightM is > 0)
            return $"{_extras.WallWidthM:F2} × {_extras.WallHeightM:F2} m";
        return "Belirtilmedi";
    }

    private string ResolutionTag() =>
        _config.Is4K ? "4K Ultra HD" : (_config.IsFullHd ? "Full HD" : "Özel");

    private static string ScreenTypeLabel(string? type) => type switch
    {
        "flat" => "Düz",
        "concave" => "İçbükey",
        "convex" => "Dışbükey",
        "lshape" => "L tipi",
        _ => string.IsNullOrWhiteSpace(type) ? "Belirtilmedi" : type,
    };

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
        table.Cell().Background(bg).BorderBottom(1).BorderColor(Color.FromHex("#e2e8f0")).PaddingVertical(2.6f).PaddingHorizontal(5).Text(value).Bold().FontSize(8.5f);
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
            mpxText = $" ({px / 1_000_000.0:F2} Mpx)";
            return px;
        }
        return 0;
    }

    private static string MediaBox(long pixels, int minPorts)
    {
        if (pixels <= 650000 && minPorts <= 1) return "NovaStar TB30 (1 Port / Cloud)";
        if (pixels <= 1300000 && minPorts <= 2) return "NovaStar TB40 (2 Port / Cloud)";
        if (pixels <= 2300000 && minPorts <= 4) return "NovaStar TB60 (4 Port / Cloud)";
        return "Harici işlemci gerekli (TB yetersiz)";
    }

    private void ComposeFooter(IContainer container)
    {
        container.Column(col =>
        {
            col.Item().LineHorizontal(0.5f).LineColor(Color.FromHex("#e2e8f0"));
            col.Item().PaddingTop(4).Row(row =>
            {
                row.RelativeItem().Text("Masaüstü Bilişim Teknolojileri — Vision Display Studio. Simülasyon amaçlı belgedir.")
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
