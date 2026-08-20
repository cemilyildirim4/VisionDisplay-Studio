using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace DisplayConfigurator.Application.Validation;

/// <summary>
/// İletişim telefonu: boşsa doldurun mesajı; doluysa 0 ile başlayan tam 11 hane.
/// </summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter)]
public sealed class ContactPhoneAttribute : ValidationAttribute
{
    public const string Pattern = @"^0\d{10}$";
    public const string FormatMessage = "Lütfen geçerli bir telefon numarası giriniz (Örn: 05xxxxxxxxxx).";
    public const string RequiredMessage = "Lütfen bu alanı doldurunuz.";

    public bool AllowEmpty { get; set; }

    protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
    {
        var compact = Compact(value as string);
        var member = validationContext.MemberName is { Length: > 0 } name ? new[] { name } : null;

        if (string.IsNullOrEmpty(compact))
        {
            if (AllowEmpty) return ValidationResult.Success;
            return new ValidationResult(RequiredMessage, member);
        }

        if (!Regex.IsMatch(compact, Pattern, RegexOptions.CultureInvariant))
            return new ValidationResult(FormatMessage, member);

        return ValidationResult.Success;
    }

    public static string Compact(string? raw) =>
        string.IsNullOrWhiteSpace(raw) ? string.Empty : raw.Trim().Replace(" ", "", StringComparison.Ordinal);
}
