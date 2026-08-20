using System.ComponentModel.DataAnnotations;
using DisplayConfigurator.Application.Validation;

namespace DisplayConfigurator.Application.DTOs;

/// <summary>
/// "PDF olarak dışa aktar" formundan gelen teklif isteğinin gövdesi.
/// Entity'yi doğrudan [FromBody] almak yerine ayrı bir DTO kullanılır ki
/// kullanıcı Status/Revision/Id gibi alanları isteğe ekleyip "override-posting"
/// yapamasın (yalnızca burada tanımlı alanlar bağlanır).
/// </summary>
public class QuoteInputDto
{
    [StringLength(150)]
    public string? CustomerName { get; set; }

    [StringLength(50)]
    public string? Phone { get; set; }

    [OptionalEmail, StringLength(150)]
    public string? Email { get; set; }

    [StringLength(500)]
    public string? Address { get; set; }

    [StringLength(2000)]
    public string? Message { get; set; }

    [StringLength(100)]
    public string? ModelCode { get; set; }

    [Range(0, 1000)]
    public decimal? WallWidthM { get; set; }

    [Range(0, 1000)]
    public decimal? WallHeightM { get; set; }

    [StringLength(20)]
    public string? ScreenMode { get; set; }

    [Range(0, 1000)]
    public int? Columns { get; set; }

    [Range(0, 1000)]
    public int? Rows { get; set; }

    [StringLength(20)]
    public string? ScreenType { get; set; }

    [StringLength(10)]
    public string? Resolution { get; set; }

    [StringLength(4000)]
    public string? ScreensSummary { get; set; }
}
