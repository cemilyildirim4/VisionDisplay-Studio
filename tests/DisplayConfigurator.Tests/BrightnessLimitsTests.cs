using DisplayConfigurator.Application.Engine;
using Xunit;

namespace DisplayConfigurator.Tests;

public class BrightnessLimitsTests
{
    [Fact]
    public void IcMekan_Tavan800()
    {
        Assert.Equal(800, BrightnessLimits.MaxIndoorNits);
        Assert.Equal(800, BrightnessLimits.Clamp(1200, outdoor: false));
        Assert.NotNull(BrightnessLimits.Validate(1200, outdoor: false));
        Assert.Null(BrightnessLimits.Validate(800, outdoor: false));
    }

    [Fact]
    public void DisMekan_TavanUygulanmaz()
    {
        Assert.True(BrightnessLimits.IsOutdoor("Dış Mekan", null));
        Assert.True(BrightnessLimits.IsOutdoor("Outdoor Panel", "Kapalı"));
        Assert.False(BrightnessLimits.IsOutdoor("Ticari İç Mekan", "Duvar"));
        Assert.Equal(5500, BrightnessLimits.Clamp(5500, outdoor: true));
        Assert.Null(BrightnessLimits.Validate(5500, outdoor: true));
    }
}
