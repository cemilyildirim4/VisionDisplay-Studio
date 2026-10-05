using DisplayConfigurator.Application.Engine;
using Xunit;

namespace DisplayConfigurator.Tests;

public class PowerHeatMathTests
{
    [Fact]
    public void RoundBtu_HamWattiYuvarlamadanIsiyaCevirir()
    {
        decimal watts = 2400m / 0.9m;
        Assert.Equal(9099m, PowerHeatMath.RoundBtu(watts));
        Assert.Equal(2.67m, Math.Round(watts / 1000m, 2));
        Assert.Equal(2666.67m, Math.Round(watts, 2));
    }

    [Fact]
    public void RecommendSupply_KucukYukteTekFaz()
    {
        var supply = PowerHeatMath.RecommendSupply(2000m);
        Assert.False(supply.ThreePhase);
        Assert.Equal("C16 A, tek faz", supply.Label);
    }

    [Fact]
    public void RecommendSupply_BuyukYukteUcFaz()
    {
        var supply = PowerHeatMath.RecommendSupply(8000m);
        Assert.True(supply.ThreePhase);
        Assert.Equal(16, supply.BreakerAmps);
        Assert.Equal("C16 A, 3 faz", supply.Label);
    }

    [Fact]
    public void Cooling_TonVeKw_MaksimumBtudan()
    {
        decimal btu = 8000m * 3.412m;
        Assert.Equal(btu / 12_000m, PowerHeatMath.CoolingTons(btu));
        Assert.Equal(8m, PowerHeatMath.CoolingKw(btu));
    }
}
