namespace DisplayConfigurator.Application.Interfaces;

/// <summary>Sistem geneli anahtar/değer ayarları (işçilik çarpanı vb.).</summary>
public interface ISystemSettingsRepository
{
    Task<decimal> GetLaborCostMultiplierAsync();
    Task SetLaborCostMultiplierAsync(decimal value);
}
