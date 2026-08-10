using Microsoft.AspNetCore.Mvc;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CabinsController : ControllerBase
{
    private readonly ICabinRepository _cabinRepository;

    public CabinsController(ICabinRepository cabinRepository)
    {
        _cabinRepository = cabinRepository;
    }

    // GET: api/cabins
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Cabin>>> GetAll()
    {
        var cabins = await _cabinRepository.GetAllAsync();
        return Ok(cabins);
    }

    // GET: api/cabins/1
    [HttpGet("{id:int}")]
    public async Task<ActionResult<Cabin>> GetById(int id)
    {
        var cabin = await _cabinRepository.GetByIdAsync(id);
        if (cabin == null)
            return NotFound(new { message = $"ID'si {id} olan kabin bulunamadı." });

        return Ok(cabin);
    }

    // GET: api/cabins/series/1
    [HttpGet("series/{seriesId:int}")]
    public async Task<ActionResult<IEnumerable<Cabin>>> GetBySeriesId(int seriesId)
    {
        var cabins = await _cabinRepository.GetBySeriesIdAsync(seriesId);
        return Ok(cabins);
    }
}