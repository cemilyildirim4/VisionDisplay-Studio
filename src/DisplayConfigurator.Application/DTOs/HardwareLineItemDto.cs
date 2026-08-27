namespace DisplayConfigurator.Application.DTOs;

/// <summary>Admin fiyat kırılımındaki tek donanım kalemi (adet × birim fiyat).</summary>
public class HardwareLineItemDto
{
    public string Key { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
}
