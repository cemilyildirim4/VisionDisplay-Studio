using System.ComponentModel.DataAnnotations;

namespace DisplayConfigurator.Application.DTOs;

public class CreateConfigurationDto
{
    [Required(ErrorMessage = "Proje adı zorunludur.")]
    [StringLength(100, ErrorMessage = "Proje adı en fazla 100 karakter olabilir.")]
    public string ProjectName { get; set; } = string.Empty;

    [StringLength(150, ErrorMessage = "Müşteri adı en fazla 150 karakter olabilir.")]
    public string? CustomerName { get; set; }

    /// <summary>İç içe müşteri nesnesi (<c>customer.name</c> / phone / email). Kök alanlardan öncelikli değil; boş kök alanları doldurur.</summary>
    public CustomerContactDto? Customer { get; set; }

    [StringLength(50)]
    public string? Phone { get; set; }

    [StringLength(150)]
    public string? Email { get; set; }

    [Range(0, 1000)]
    public decimal? WallWidthM { get; set; }

    [Range(0, 1000)]
    public decimal? WallHeightM { get; set; }

    [StringLength(20)]
    public string? ScreenMode { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Geçerli bir kabin seçilmelidir.")]
    public int CabinId { get; set; }

    [Range(1, 50, ErrorMessage = "Sütun sayısı 1 ile 50 arasında olmalıdır.")]
    public int Cols { get; set; }

    [Range(1, 50, ErrorMessage = "Satır sayısı 1 ile 50 arasında olmalıdır.")]
    public int Rows { get; set; }
    public string? AssemblyType { get; set; } // "MODULE" veya "CABINET"
    public int ModulesPerCard { get; set; }   // Kullanıcı özel değer vermezse Cabin varsayılanı kullanılır

    /// <summary>Yapılandırmaya mini PC dahil edilsin mi.</summary>
    public bool HasMiniPc { get; set; }

    /// <summary>İşçilik maliyeti çarpanı (para birimi / m²). Boşsa sistem varsayılanı kullanılır.</summary>
    public decimal? LaborCostMultiplier { get; set; }

    public int? PowerSupplyId { get; set; }
    public int? MiniPcId { get; set; }
    public int? PatchCableId { get; set; }
    public int? ReceivingCardId { get; set; }
    public int? ProcessorId { get; set; }
}