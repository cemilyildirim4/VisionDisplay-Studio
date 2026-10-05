namespace DisplayConfigurator.Application.Engine;

/// <summary>
/// Şebeke akımı, sigorta ve soğutma. Watt ham kalır; yuvarlama çağıran katmandadır.
/// Tek faz 220 V sığmazsa (1,25 payından sonra 32 A üstü) 3 faz 380 V kullanılır.
/// </summary>
public static class PowerHeatMath
{
    public const decimal GridVoltage = 220m;
    public const decimal ThreePhaseVoltage = 380m;
    public const decimal PowerFactor = 0.95m;
    public const decimal BreakerTolerance = 1.25m;
    public const decimal BtuPerTon = 12_000m;
    public const int SinglePhaseBreakerLimit = 32;

    /// <summary>√3, 3 faz akım formülü için.</summary>
    public const decimal Sqrt3 = 1.73205080756888m;

    private static readonly int[] StandardBreakers =
    [
        6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 630,
    ];

    public readonly record struct SupplyRecommendation(
        decimal CurrentAmps,
        int BreakerAmps,
        bool ThreePhase,
        string Label);

    public static decimal MaxCurrentAmps(decimal maxWatts, bool threePhase)
    {
        if (maxWatts <= 0) return 0m;
        decimal volts = threePhase ? Sqrt3 * ThreePhaseVoltage : GridVoltage;
        return maxWatts / (volts * PowerFactor);
    }

    public static int CeilStandardBreaker(decimal requiredAmps)
    {
        if (requiredAmps <= 0) return 0;
        foreach (int size in StandardBreakers)
        {
            if (size >= requiredAmps) return size;
        }

        return StandardBreakers[^1];
    }

    public static SupplyRecommendation RecommendSupply(decimal maxWatts)
    {
        if (maxWatts <= 0)
            return new SupplyRecommendation(0m, 0, false, "—");

        decimal single = MaxCurrentAmps(maxWatts, threePhase: false);
        int singleBreaker = CeilStandardBreaker(single * BreakerTolerance);
        if (singleBreaker <= SinglePhaseBreakerLimit)
            return new SupplyRecommendation(single, singleBreaker, false, $"C{singleBreaker} A, tek faz");

        decimal three = MaxCurrentAmps(maxWatts, threePhase: true);
        int threeBreaker = CeilStandardBreaker(three * BreakerTolerance);
        return new SupplyRecommendation(three, threeBreaker, true, $"C{threeBreaker} A, 3 faz");
    }

    public static decimal CoolingTons(decimal maxBtu) =>
        maxBtu <= 0 ? 0m : maxBtu / BtuPerTon;

    public static decimal CoolingKw(decimal maxBtu) =>
        maxBtu <= 0 ? 0m : maxBtu / ConfigurationCalculator.WattsToBtu / 1000m;

    /// <summary>BTU gösterimi: en yakın tam sayı, 0,5 yukarı.</summary>
    public static decimal RoundBtu(decimal watts) =>
        Math.Round(watts * ConfigurationCalculator.WattsToBtu, 0, MidpointRounding.AwayFromZero);
}
