using DisplayConfigurator.Api.Security;
using DisplayConfigurator.Application.DTOs;
using DisplayConfigurator.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace DisplayConfigurator.Api.Controllers;

/// <summary>Sistem geneli ayarlar — işçilik çarpanı ($USD/m²).</summary>
[ApiController]
[Route("api/settings")]
public class SettingsController : ControllerBase
{
    private readonly ISystemSettingsRepository _settings;

    public SettingsController(ISystemSettingsRepository settings)
    {
        _settings = settings;
    }

    [HttpGet("labor-cost-multiplier")]
    public async Task<ActionResult<LaborCostMultiplierDto>> GetLaborCostMultiplier()
    {
        var value = await _settings.GetLaborCostMultiplierAsync();
        return Ok(new LaborCostMultiplierDto { Value = value });
    }

    [AdminOnly]
    [HttpPut("labor-cost-multiplier")]
    public async Task<ActionResult<LaborCostMultiplierDto>> UpdateLaborCostMultiplier([FromBody] LaborCostMultiplierDto input)
    {
        if (input.Value < 0)
            return BadRequest(new { message = "İşçilik çarpanı negatif olamaz." });

        await _settings.SetLaborCostMultiplierAsync(input.Value);
        return Ok(new LaborCostMultiplierDto { Value = input.Value });
    }
}
