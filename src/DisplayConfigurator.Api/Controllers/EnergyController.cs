using Microsoft.AspNetCore.Mvc;
using DisplayConfigurator.Application.Engine;

namespace DisplayConfigurator.Api.Controllers;

/// <summary>LED ekran enerji tüketim hesabı. Kayıt oluşturmaz.</summary>
[ApiController]
[Route("api/energy")]
public class EnergyController : ControllerBase
{
    [HttpPost("calculate")]
    [ProducesResponseType(typeof(LedEnergyResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public ActionResult<LedEnergyResult> Calculate([FromBody] LedEnergyInput input)
    {
        try
        {
            return Ok(LedEnergyCalculator.Calculate(input ?? new LedEnergyInput()));
        }
        catch (LedEnergyValidationException ex)
        {
            var problem = new ProblemDetails
            {
                Title = "Eksik enerji parametresi",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            };
            problem.Extensions["missingFields"] = ex.MissingFields;
            return BadRequest(problem);
        }
    }
}
