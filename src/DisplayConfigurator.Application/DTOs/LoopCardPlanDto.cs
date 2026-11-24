namespace DisplayConfigurator.Application.DTOs;

/// <summary>
/// Looplamalı modülde alıcı kart: 512×512 px tam kapasite ve önerilen (max 3'lü / 2'li) dağılım.
/// </summary>
public class LoopCardPlanDto
{
    public int MaxCapacityCardCount { get; set; }
    public int RecommendedCardCount { get; set; }
    public int MaxModulesPerCardX { get; set; }
    public int MaxModulesPerCardY { get; set; }
    public int RecommendedMaxLoop { get; set; }
    public int ModulePixelWidth { get; set; }
    public int ModulePixelHeight { get; set; }
    public int EdgePixels { get; set; }
    public IReadOnlyList<int> MaxHorizontalGroups { get; set; } = [];
    public IReadOnlyList<int> RecommendedHorizontalGroups { get; set; } = [];
    public string MaxCapacityLabel { get; set; } = string.Empty;
    public string RecommendedLabel { get; set; } = string.Empty;
}
