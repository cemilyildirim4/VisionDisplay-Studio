using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace DisplayConfigurator.Application.Validation;

/// <summary>
/// İletişim e-postası: boşsa doldurun; doluysa @ içeren yerel@alan.tld yapısı.
/// </summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter)]
public sealed class ContactEmailAttribute : ValidationAttribute
{
    public const string FormatMessage = "Lütfen geçerli bir e-posta adresi giriniz.";
    public const string RequiredMessage = "Lütfen bu alanı doldurunuz.";

    /// <summary>Yerel kısım @ alan adı . en az 2 karakterlik TLD (gmail.com, hotmail.com, icloud.com, şirket.tld).</summary>
    private static readonly Regex EmailShape = new(
        @"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$",
        RegexOptions.CultureInvariant | RegexOptions.Compiled);

    public bool AllowEmpty { get; set; }

    protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
    {
        var text = (value as string)?.Trim() ?? string.Empty;
        var member = validationContext.MemberName is { Length: > 0 } name ? new[] { name } : null;

        if (string.IsNullOrEmpty(text))
        {
            if (AllowEmpty) return ValidationResult.Success;
            return new ValidationResult(RequiredMessage, member);
        }

        if (!text.Contains('@') || !EmailShape.IsMatch(text))
            return new ValidationResult(FormatMessage, member);

        return ValidationResult.Success;
    }
}
