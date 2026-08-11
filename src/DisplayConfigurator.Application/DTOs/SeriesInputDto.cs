namespace DisplayConfigurator.Application.DTOs;

/// <summary>
/// Admin panelinden seri (ürün ailesi) oluşturma/güncelleme isteğinin gövdesi.
/// </summary>
public class SeriesInputDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}
