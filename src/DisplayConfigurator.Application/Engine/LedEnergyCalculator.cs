namespace DisplayConfigurator.Application.Engine;

/// <summary>LED ekran enerji tüketim hesabı girdileri. Mağaza adı isteğe bağlıdır.</summary>
public sealed class LedEnergyInput
{
    public string? StoreName { get; init; }
    public string? PanelType { get; init; }
    public int? PanelCount { get; init; }
    public decimal? DailyHours { get; init; }
    public int? DaysPerMonth { get; init; }
    public decimal? WattsPerSquareMeter { get; init; }
    public decimal? TotalSquareMeters { get; init; }
    public decimal? PricePerKwh { get; init; }
}

public sealed class LedEnergyResult
{
    public string? StoreName { get; init; }
    public string PanelType { get; init; } = "";
    public int PanelCount { get; init; }
    public decimal DailyHours { get; init; }
    public int DaysPerMonth { get; init; }
    public decimal WattsPerSquareMeter { get; init; }
    public decimal TotalSquareMeters { get; init; }
    public decimal PricePerKwh { get; init; }
    public decimal DailyKwh { get; init; }
    public decimal DailyCostTry { get; init; }
    public decimal MonthlyKwh { get; init; }
    public decimal MonthlyCostTry { get; init; }
}

public sealed class LedEnergyValidationException : ArgumentException
{
    public IReadOnlyList<string> MissingFields { get; }

    public LedEnergyValidationException(IReadOnlyList<string> missingFields)
        : base("Eksik parametre: " + string.Join(", ", missingFields) + ".")
    {
        MissingFields = missingFields;
    }
}

/// <summary>
/// Günlük kWh = m² × (W/m²) × saat / 1000.
/// Tutar = kWh × ₺/kWh. Aylık = günlük × gün sayısı.
/// </summary>
public static class LedEnergyCalculator
{
    public static LedEnergyResult Calculate(LedEnergyInput input)
    {
        var missing = new List<string>();
        if (string.IsNullOrWhiteSpace(input.PanelType)) missing.Add("Panel tipi");
        if (input.PanelCount is null or <= 0) missing.Add("Kullanılacak panel sayısı");
        if (input.DailyHours is null or <= 0) missing.Add("Günlük çalışma saati");
        if (input.DaysPerMonth is null or <= 0) missing.Add("Aylık çalışacak gün sayısı");
        if (input.WattsPerSquareMeter is null or <= 0) missing.Add("1 m² saatlik enerji tüketimi");
        if (input.TotalSquareMeters is null or <= 0) missing.Add("Toplam LED m² miktarı");
        if (input.PricePerKwh is null) missing.Add("Saatlik elektrik ücreti");

        if (missing.Count > 0)
            throw new LedEnergyValidationException(missing);

        decimal dailyKwh = Round2(input.TotalSquareMeters!.Value * input.WattsPerSquareMeter!.Value * input.DailyHours!.Value / 1000m);
        decimal dailyCost = Round2(dailyKwh * input.PricePerKwh!.Value);
        decimal monthlyKwh = Round2(dailyKwh * input.DaysPerMonth!.Value);
        decimal monthlyCost = Round2(monthlyKwh * input.PricePerKwh.Value);

        return new LedEnergyResult
        {
            StoreName = string.IsNullOrWhiteSpace(input.StoreName) ? null : input.StoreName.Trim(),
            PanelType = input.PanelType!.Trim(),
            PanelCount = input.PanelCount!.Value,
            DailyHours = input.DailyHours.Value,
            DaysPerMonth = input.DaysPerMonth!.Value,
            WattsPerSquareMeter = input.WattsPerSquareMeter.Value,
            TotalSquareMeters = input.TotalSquareMeters.Value,
            PricePerKwh = input.PricePerKwh.Value,
            DailyKwh = dailyKwh,
            DailyCostTry = dailyCost,
            MonthlyKwh = monthlyKwh,
            MonthlyCostTry = monthlyCost,
        };
    }

    private static decimal Round2(decimal value) =>
        Math.Round(value, 2, MidpointRounding.AwayFromZero);
}
