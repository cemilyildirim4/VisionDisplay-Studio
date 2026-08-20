using System.ComponentModel.DataAnnotations;

namespace DisplayConfigurator.Application.Validation;

/// <summary>
/// Boş e-posta geçerli (alan isteğe bağlı). Doluysa e-posta biçimi kontrol edilir.
/// Standart [EmailAddress] boş string'de de başarısız olduğu için PDF/teklif
/// formunda genel "istek hatalı" yanıtına yol açıyordu.
/// </summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter)]
public sealed class OptionalEmailAttribute : ValidationAttribute
{
    public OptionalEmailAttribute()
    {
        ErrorMessage = "Lütfen geçerli bir e-posta adresi giriniz.";
    }

    public override bool IsValid(object? value)
    {
        if (value is null) return true;
        if (value is not string text) return false;
        if (string.IsNullOrWhiteSpace(text)) return true;
        return new EmailAddressAttribute().IsValid(text.Trim());
    }
}
