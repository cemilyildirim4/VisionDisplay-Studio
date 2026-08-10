using DisplayConfigurator.Application.DTOs;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;
using QuestPDF.Helpers;

namespace DisplayConfigurator.Infrastructure.Pdf;

public class SpecSheetDocument : IDocument
{
    private readonly ConfigurationResponseDto _model;

    public SpecSheetDocument(ConfigurationResponseDto model)
    {
        _model = model;
    }

    public DocumentMetadata GetMetadata() => DocumentMetadata.Default;

    public void Compose(IDocumentContainer container)
    {
        container
            .Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(1.5f, Unit.Centimetre);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(9.5f).FontFamily("Arial"));

                page.Header().Element(ComposeHeader);
                page.Content().Element(ComposeContent);
                page.Footer().Element(ComposeFooter);
            });
    }

    private void ComposeHeader(IContainer container)
    {
        container.Column(headerCol =>
        {
            headerCol.Item().Row(row =>
            {
                row.RelativeItem().Column(column =>
                {
                    column.Item().Text(string.IsNullOrWhiteSpace(_model.ProjectName) ? "LED Ekran Projesi" : _model.ProjectName)
                        .FontSize(20)
                        .Bold()
                        .FontColor(Colors.Blue.Darken4);

                    column.Item().PaddingTop(2).Text($"Müşteri: {(string.IsNullOrWhiteSpace(_model.CustomerName) ? "Belirtilmedi" : _model.CustomerName)}")
                        .FontSize(10)
                        .FontColor(Colors.Grey.Darken2);
                    
                    column.Item().Text($"Tarih: {_model.CreatedAt:dd.MM.yyyy HH:mm}")
                        .FontSize(9)
                        .FontColor(Colors.Grey.Medium);
                });

                row.ConstantItem(150).AlignRight().Column(col =>
                {
                    col.Item().Text("DISPLAY").FontSize(16).ExtraBold().FontColor(Colors.Grey.Darken4).LetterSpacing(0.05f);
                    col.Item().Text("CONFIGURATOR").FontSize(9).Bold().FontColor(Colors.Blue.Darken2).LetterSpacing(0.1f);
                    col.Item().PaddingTop(2).Text("TEKNİK ŞARTNAME (SPEC SHEET)").FontSize(7).Bold().FontColor(Colors.Grey.Medium);
                });
            });

            headerCol.Item().PaddingTop(10).LineHorizontal(1.5f).LineColor(Colors.Blue.Darken3);
        });
    }

    private void ComposeContent(IContainer container)
    {
        // --- DEFANSİF VE ORTAK HESAPLAMA MANTIĞI ---
        int safeCols = Math.Max(1, _model.Cols);
        int safeRows = Math.Max(1, _model.Rows);
        int totalCabinets = safeCols * safeRows;

        // 1. Fiziksel Ölçüler ve Köşegen Hesabı (Mm ve Metre)
        double totalWidthMm = _model.TotalWidthMm;
        double totalHeightMm = _model.TotalHeightMm;
        double totalWidthM = totalWidthMm / 1000.0;
        double totalHeightM = totalHeightMm / 1000.0;
        
        // Köşegen Hesabı (Tam sayı yuvarlama)
        double diagonalInches = totalHeightMm > 0 
            ? Math.Round(Math.Sqrt(Math.Pow(totalWidthMm, 2) + Math.Pow(totalHeightMm, 2)) / 25.4) 
            : 0;

        // 2. Güç Tüketimi (Watt ve kW Dönüşümleri)
        double maxWatts = (double)_model.TotalMaxPowerKw * 1000.0;
        double avgWatts = Math.Round(maxWatts / 3.0); // Max/3 standardı

        double maxKw = maxWatts / 1000.0;
        double avgKw = avgWatts / 1000.0;

        // 3. Isı Yayılımı (BTU/hr) - 1 W = 3.412142 BTU/hr
        double maxHeatBtu = Math.Round(maxWatts * 3.412142);
        double avgHeatBtu = Math.Round(avgWatts * 3.412142);

        // 4. Çözünürlük, Toplam Piksel ve Kontrolör Hesaplama Motoru
        long rawTotalPixels = 0;
        string mpxText = "";

        if (!string.IsNullOrEmpty(_model.TotalResolution) && _model.TotalResolution.Contains('x'))
        {
            var parts = _model.TotalResolution.ToLower().Replace(" ", "").Split('x');
            if (parts.Length == 2 && long.TryParse(parts[0], out long w) && long.TryParse(parts[1], out long h))
            {
                rawTotalPixels = w * h;
                double mpx = rawTotalPixels / 1000000.0;
                mpxText = $" ({mpx:F2} Mpx)";
            }
        }

        // --- DİNAMİK KONTROLÖR VE PORT SEÇİM MANTIĞI ---
        int minPorts = rawTotalPixels > 0 ? (int)Math.Max(1, Math.Ceiling(rawTotalPixels / 650000.0)) : 1;
        int maxPorts = rawTotalPixels > 0 ? (int)Math.Max(1, Math.Ceiling(rawTotalPixels / 550000.0)) : 1;
        string portText = minPorts == maxPorts ? $"{minPorts} Port" : $"{minPorts} - {maxPorts} Port";

        // NovaStar Taurus Medya Oynatıcı Seçimi
        string mediaBox = "";
        if (rawTotalPixels <= 650000 && minPorts <= 1) mediaBox = "NovaStar TB30 (1 Port / Cloud)";
        else if (rawTotalPixels <= 1300000 && minPorts <= 2) mediaBox = "NovaStar TB40 (2 Port / Cloud)";
        else if (rawTotalPixels <= 2300000 && minPorts <= 4) mediaBox = "NovaStar TB60 (4 Port / Cloud)";
        else mediaBox = "Harici İşlemci Gerekli (TB Yetersiz)";

        // NovaStar Pro-AV İşlemci Seçimi
        string processor = "";
        if (rawTotalPixels > 6500000 || minPorts > 10) processor = "NovaStar MCTRL4K (16 Port / 4K)";
        else if (rawTotalPixels > 3900000 || minPorts > 6) processor = "NovaStar VX1000 (10 Port)";
        else if (rawTotalPixels > 2600000 || minPorts > 4) processor = "NovaStar VX600 (6 Port)";
        else processor = "NovaStar VX400 (4 Port)";

        container.PaddingVertical(0.8f, Unit.Centimetre).Column(column =>
        {
            // 1. Ekran Özet Rozetleri (Summary Cards)
            column.Item().Background(Colors.Grey.Lighten4).Border(1).BorderColor(Colors.Grey.Lighten2).Padding(10).Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("EKRAN DÜZENİ").FontSize(8).Bold().FontColor(Colors.Grey.Darken1);
                    c.Item().Text($"{safeCols} Sütun x {safeRows} Satır").Bold().FontSize(11).FontColor(Colors.Grey.Darken4);
                    c.Item().Text($"Toplam {totalCabinets} Kabin").FontSize(8).FontColor(Colors.Grey.Medium);
                });

                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("EN-BOY ORANI").FontSize(8).Bold().FontColor(Colors.Grey.Darken1);
                    c.Item().Text(string.IsNullOrEmpty(_model.AspectRatio) ? "16:9" : _model.AspectRatio).Bold().FontSize(11).FontColor(Colors.Grey.Darken4);
                    c.Item().Text($"{diagonalInches:F0}\" Köşegen").FontSize(8).FontColor(Colors.Grey.Medium);
                });

                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("ÇÖZÜNÜRLÜK STANDARDI").FontSize(8).Bold().FontColor(Colors.Grey.Darken1);
                    string tag = _model.Is4K ? "4K Ultra HD" : (_model.IsFullHd ? "Full HD" : "Custom");
                    c.Item().Text(tag).Bold().FontSize(11).FontColor(_model.Is4K ? Colors.Green.Darken2 : (_model.IsFullHd ? Colors.Blue.Darken2 : Colors.Orange.Darken2));
                    c.Item().Text($"{_model.TotalResolution} px").FontSize(8).FontColor(Colors.Grey.Medium);
                });
            });

            column.Item().Height(15);

            // 2. Teknik Özellikler Tablosu (Arayüzle Tam Senkronize)
            column.Item().Text("Teknik Özellikler").FontSize(13).Bold().FontColor(Colors.Blue.Darken4);
            column.Item().PaddingTop(6).Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.RelativeColumn(2);
                    columns.RelativeColumn(3);
                });

                // Tablo Başlığı
                table.Header(header =>
                {
                    header.Cell().Background(Colors.Blue.Darken3).Padding(6).Text("Parametre").FontColor(Colors.White).Bold().FontSize(9);
                    header.Cell().Background(Colors.Blue.Darken3).Padding(6).Text("Değer").FontColor(Colors.White).Bold().FontSize(9);
                });

                // Satırlar
                bool isAlt = true;
                AddRow(table, "Kabin Modeli", string.IsNullOrWhiteSpace(_model.CabinModelName) ? "Standart Kabin" : _model.CabinModelName, ref isAlt);
                AddRow(table, "Fiziksel Ölçüler (G x Y)", $"{totalWidthMm:N0} mm x {totalHeightMm:N0} mm ({totalWidthM:F2} m x {totalHeightM:F2} m)", ref isAlt);
                AddRow(table, "Köşegen Boyutu", $"{diagonalInches:F0}\" Inches", ref isAlt);
                AddRow(table, "Toplam Çözünürlük", $"{_model.TotalResolution} px{mpxText}", ref isAlt);
                AddRow(table, "Kabin Adedi & Matris", $"{totalCabinets} Adet ({safeCols} Sütun x {safeRows} Satır)", ref isAlt);
                
                // --- YENİ EKLENEN KONTROLÖR PARAMETRELERİ ---
                AddRow(table, "Gerekli RJ45 Ethernet Portu", portText, ref isAlt);
                AddRow(table, "Tavsiye Medya Oynatıcı", mediaBox, ref isAlt);
                AddRow(table, "Tavsiye Pro-AV İşlemci", processor, ref isAlt);

                AddRow(table, "Tahmini Toplam Ağırlık", $"{_model.TotalWeightKg:N1} kg", ref isAlt);
                AddRow(table, "Maksimum Güç Tüketimi", $"{maxKw:F2} kW ({maxWatts:N0} W)", ref isAlt);
                AddRow(table, "Ortalama Güç Tüketimi", $"{avgKw:F2} kW ({avgWatts:N0} W)", ref isAlt);
                AddRow(table, "Maksimum Isı Yayılımı", $"{maxHeatBtu:N0} BTU/hr", ref isAlt);
                AddRow(table, "Ortalama Isı Yayılımı", $"{avgHeatBtu:N0} BTU/hr", ref isAlt);
            });

            column.Item().Height(20);

            // 3. Dipnotlar ve Fiyat Kutusu
            column.Item().Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("* Belirtilen değerler teorik fabrika verilerine dayanmaktadır.").FontSize(7.5f).Italic().FontColor(Colors.Grey.Medium);
                    c.Item().Text("* RJ45 port ihtiyacı port başına max 650.000 piksel sınırına göre hesaplanmıştır.").FontSize(7.5f).Italic().FontColor(Colors.Grey.Medium);
                    c.Item().Text("* Isı yayılımı 1 W = 3.412142 BTU/hr dönüşüm oranıyla hesaplanmıştır.").FontSize(7.5f).Italic().FontColor(Colors.Grey.Medium);
                });

                row.ConstantItem(200).AlignRight().Background(Colors.Grey.Lighten4).Border(1).BorderColor(Colors.Grey.Lighten2).Padding(8).Column(col =>
                {
                    col.Item().Text("Tahmini Toplam Fiyat").FontSize(8.5f).Bold().FontColor(Colors.Grey.Darken2);
                    col.Item().Text($"${_model.TotalPrice:N2}").FontSize(18).Bold().FontColor(Colors.Green.Darken2);
                });
            });
        });
    }

    private static void AddRow(TableDescriptor table, string label, string value, ref bool isAlternate)
    {
        var bgColor = isAlternate ? Colors.Grey.Lighten5 : Colors.White;
        isAlternate = !isAlternate;

        table.Cell().Background(bgColor).BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(5.5f).Text(label).FontSize(9);
        table.Cell().Background(bgColor).BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(5.5f).Text(value).Bold().FontSize(9);
    }

    private void ComposeFooter(IContainer container)
    {
        container.Column(col =>
        {
            col.Item().LineHorizontal(0.5f).LineColor(Colors.Grey.Lighten2);
            col.Item().PaddingTop(4).Row(row =>
            {
                row.RelativeItem().Text("Bu teknik şartname DisplayConfigurator tarafından otomatik üretilmiştir.").FontSize(7.5f).FontColor(Colors.Grey.Medium);
                row.ConstantItem(60).AlignRight().Text(text =>
                {
                    text.Span("Sayfa ").FontSize(7.5f).FontColor(Colors.Grey.Medium);
                    text.CurrentPageNumber().FontSize(7.5f).FontColor(Colors.Grey.Medium);
                });
            });
        });
    }
}