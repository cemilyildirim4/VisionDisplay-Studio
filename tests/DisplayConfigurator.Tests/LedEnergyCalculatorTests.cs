using DisplayConfigurator.Application.Engine;
using Xunit;

namespace DisplayConfigurator.Tests;

public class LedEnergyCalculatorTests
{
    [Fact]
    public void Calculate_OrnekGirdiler_FormuluIkiOndaliklaUygular()
    {
        var result = LedEnergyCalculator.Calculate(new LedEnergyInput
        {
            StoreName = "Örnek Mağaza",
            PanelType = "P 2.5",
            PanelCount = 198,
            DailyHours = 24m,
            DaysPerMonth = 30,
            WattsPerSquareMeter = 300m,
            TotalSquareMeters = 10.14m,
            PricePerKwh = 3.92m,
        });

        // (10,14 × 300 × 24) / 1000 = 73,008 → 73,01 kWh
        Assert.Equal(73.01m, result.DailyKwh);
        Assert.Equal(286.20m, result.DailyCostTry);
        Assert.Equal(2190.30m, result.MonthlyKwh);
        Assert.Equal(8585.98m, result.MonthlyCostTry);
        Assert.Equal(26283.60m, result.YearlyKwh);
        Assert.Equal(103031.76m, result.YearlyCostTry);
    }

    [Fact]
    public void Calculate_EksikParametre_HangiAlaninEksikOldugunuSoyer()
    {
        var ex = Assert.Throws<LedEnergyValidationException>(() =>
            LedEnergyCalculator.Calculate(new LedEnergyInput
            {
                PanelType = "P 2.5",
                PanelCount = 10,
            }));

        Assert.Contains("Günlük çalışma saati", ex.MissingFields);
        Assert.Contains("Toplam LED m² miktarı", ex.MissingFields);
        Assert.Contains("Saatlik elektrik ücreti", ex.MissingFields);
        Assert.Contains("Eksik parametre", ex.Message);
    }
}
