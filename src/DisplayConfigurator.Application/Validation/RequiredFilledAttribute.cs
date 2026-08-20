using System.ComponentModel.DataAnnotations;

namespace DisplayConfigurator.Application.Validation;

/// <summary>Null, boş veya yalnızca boşluk kabul edilmez.</summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter)]
public sealed class RequiredFilledAttribute : ValidationAttribute
{
    public RequiredFilledAttribute()
    {
        ErrorMessage = "Lütfen bu alanı doldurunuz.";
    }

    public override bool IsValid(object? value)
    {
        if (value is null) return false;
        if (value is string text) return !string.IsNullOrWhiteSpace(text);
        return true;
    }
}
