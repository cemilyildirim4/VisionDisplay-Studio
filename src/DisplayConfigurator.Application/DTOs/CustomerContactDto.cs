namespace DisplayConfigurator.Application.DTOs;

/// <summary>
/// Müşteri iletişim kümesi — tablolar <c>customer.name</c> / <c>phone</c> / <c>email</c> okur.
/// Kök alandaki CustomerName/Phone/Email ile aynı veri; iç içe gönderim de kabul edilir.
/// </summary>
public class CustomerContactDto
{
    public string? Name { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
}
