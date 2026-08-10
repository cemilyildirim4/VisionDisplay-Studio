using Microsoft.AspNetCore.Mvc;
using DisplayConfigurator.Application.DTOs;
using DisplayConfigurator.Application.Interfaces;

namespace DisplayConfigurator.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ConfigurationsController : ControllerBase
{
    private readonly IConfigurationService _configurationService;

    public ConfigurationsController(IConfigurationService configurationService)
    {
        _configurationService = configurationService;
    }

    // GET: api/configurations
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ConfigurationResponseDto>>> GetAll()
    {
        var result = await _configurationService.GetAllAsync();
        return Ok(result);
    }

    // GET: api/configurations/1
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ConfigurationResponseDto>> GetById(int id)
    {
        var result = await _configurationService.GetByIdAsync(id);
        if (result == null)
            return NotFound(new { message = "Konfigürasyon bulunamadı." });

        return Ok(result);
    }

    // POST: api/configurations
    [HttpPost]
    public async Task<ActionResult<ConfigurationResponseDto>> Create([FromBody] CreateConfigurationDto dto)
    {
        try
        {
            var result = await _configurationService.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // DELETE: api/configurations/1 (YENİ)
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _configurationService.DeleteAsync(id);
        if (!deleted)
            return NotFound(new { message = $"ID'si {id} olan konfigürasyon bulunamadı." });

        return Ok(new { message = "Konfigürasyon başarıyla silindi." });
    }

    // GET: api/configurations/1/pdf (KAYITLI PROJE PDF'İ)
    [HttpGet("{id}/pdf")]
    public async Task<IActionResult> DownloadSpecSheet(int id)
    {
        var pdfBytes = await _configurationService.GenerateSpecSheetPdfAsync(id);
        
        if (pdfBytes == null)
            return NotFound("Konfigürasyon bulunamadı.");

        string fileName = $"SpecSheet_Config_{id}.pdf";
        return File(pdfBytes, "application/pdf", fileName);
    }

    // POST: api/configurations/export-pdf (CANLI EKRAN / TASLAK PDF'İ - SAMSUNG MODELİ)
    [HttpPost("export-pdf")]
    public async Task<IActionResult> ExportPdfDirect([FromBody] CreateConfigurationDto dto)
    {
        try
        {
            var pdfBytes = await _configurationService.GenerateSpecSheetPdfFromDtoAsync(dto);

            if (pdfBytes == null || pdfBytes.Length == 0)
                return BadRequest(new { message = "PDF şartnamesi oluşturulamadı." });

            string fileName = "SpecSheet_Draft.pdf";
            return File(pdfBytes, "application/pdf", fileName);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "PDF oluşturulurken beklenmeyen bir hata oluştu.", error = ex.Message });
        }
    }
}