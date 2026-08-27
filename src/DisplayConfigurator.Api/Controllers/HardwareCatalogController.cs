using DisplayConfigurator.Api.Security;
using DisplayConfigurator.Application.DTOs;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace DisplayConfigurator.Api.Controllers;

/// <summary>
/// Admin katalog CRUD: güç kaynağı, mini PC, patch kablosu, alıcı kart, işlemci.
/// Liste/GET herkese açık (konfigüratör); yazma yalnızca Admin.
/// </summary>
[ApiController]
[Route("api/hardware")]
public class HardwareCatalogController : ControllerBase
{
    private readonly IHardwareCatalogRepository _catalog;

    public HardwareCatalogController(IHardwareCatalogRepository catalog)
    {
        _catalog = catalog;
    }

    // --- Güç kaynağı ---
    [HttpGet("power-supplies")]
    public async Task<ActionResult<IEnumerable<PowerSupply>>> GetPowerSupplies() =>
        Ok(await _catalog.GetPowerSuppliesAsync());

    [HttpGet("power-supplies/{id:int}")]
    public async Task<ActionResult<PowerSupply>> GetPowerSupply(int id) =>
        GetById(await _catalog.GetPowerSupplyByIdAsync(id));

    [AdminOnly]
    [HttpPost("power-supplies")]
    public async Task<ActionResult<PowerSupply>> CreatePowerSupply([FromBody] HardwareComponentInputDto input)
    {
        var error = Validate(input);
        if (error is not null) return BadRequest(new { message = error });
        var created = await _catalog.CreatePowerSupplyAsync(Apply(input, new PowerSupply()));
        return CreatedAtAction(nameof(GetPowerSupply), new { id = created.Id }, created);
    }

    [AdminOnly]
    [HttpPut("power-supplies/{id:int}")]
    public async Task<ActionResult<PowerSupply>> UpdatePowerSupply(int id, [FromBody] HardwareComponentInputDto input)
    {
        var existing = await _catalog.GetPowerSupplyByIdAsync(id);
        if (existing is null) return NotFound();
        var error = Validate(input);
        if (error is not null) return BadRequest(new { message = error });
        Apply(input, existing);
        await _catalog.UpdatePowerSupplyAsync(existing);
        return Ok(existing);
    }

    [AdminOnly]
    [HttpDelete("power-supplies/{id:int}")]
    public async Task<IActionResult> DeletePowerSupply(int id) =>
        await DeleteAsync(id, _catalog.GetPowerSupplyByIdAsync, _catalog.CountPowerSupplyReferencesAsync, _catalog.DeletePowerSupplyAsync, "güç kaynağı");

    // --- Mini PC ---
    [HttpGet("mini-pcs")]
    public async Task<ActionResult<IEnumerable<MiniPc>>> GetMiniPcs() =>
        Ok(await _catalog.GetMiniPcsAsync());

    [HttpGet("mini-pcs/{id:int}")]
    public async Task<ActionResult<MiniPc>> GetMiniPc(int id) =>
        GetById(await _catalog.GetMiniPcByIdAsync(id));

    [AdminOnly]
    [HttpPost("mini-pcs")]
    public async Task<ActionResult<MiniPc>> CreateMiniPc([FromBody] HardwareComponentInputDto input)
    {
        var error = Validate(input);
        if (error is not null) return BadRequest(new { message = error });
        var created = await _catalog.CreateMiniPcAsync(Apply(input, new MiniPc()));
        return CreatedAtAction(nameof(GetMiniPc), new { id = created.Id }, created);
    }

    [AdminOnly]
    [HttpPut("mini-pcs/{id:int}")]
    public async Task<ActionResult<MiniPc>> UpdateMiniPc(int id, [FromBody] HardwareComponentInputDto input)
    {
        var existing = await _catalog.GetMiniPcByIdAsync(id);
        if (existing is null) return NotFound();
        var error = Validate(input);
        if (error is not null) return BadRequest(new { message = error });
        Apply(input, existing);
        await _catalog.UpdateMiniPcAsync(existing);
        return Ok(existing);
    }

    [AdminOnly]
    [HttpDelete("mini-pcs/{id:int}")]
    public async Task<IActionResult> DeleteMiniPc(int id) =>
        await DeleteAsync(id, _catalog.GetMiniPcByIdAsync, _catalog.CountMiniPcReferencesAsync, _catalog.DeleteMiniPcAsync, "mini PC");

    // --- Patch kablosu ---
    [HttpGet("patch-cables")]
    public async Task<ActionResult<IEnumerable<PatchCable>>> GetPatchCables() =>
        Ok(await _catalog.GetPatchCablesAsync());

    [HttpGet("patch-cables/{id:int}")]
    public async Task<ActionResult<PatchCable>> GetPatchCable(int id) =>
        GetById(await _catalog.GetPatchCableByIdAsync(id));

    [AdminOnly]
    [HttpPost("patch-cables")]
    public async Task<ActionResult<PatchCable>> CreatePatchCable([FromBody] HardwareComponentInputDto input)
    {
        var error = Validate(input);
        if (error is not null) return BadRequest(new { message = error });
        var created = await _catalog.CreatePatchCableAsync(Apply(input, new PatchCable()));
        return CreatedAtAction(nameof(GetPatchCable), new { id = created.Id }, created);
    }

    [AdminOnly]
    [HttpPut("patch-cables/{id:int}")]
    public async Task<ActionResult<PatchCable>> UpdatePatchCable(int id, [FromBody] HardwareComponentInputDto input)
    {
        var existing = await _catalog.GetPatchCableByIdAsync(id);
        if (existing is null) return NotFound();
        var error = Validate(input);
        if (error is not null) return BadRequest(new { message = error });
        Apply(input, existing);
        await _catalog.UpdatePatchCableAsync(existing);
        return Ok(existing);
    }

    [AdminOnly]
    [HttpDelete("patch-cables/{id:int}")]
    public async Task<IActionResult> DeletePatchCable(int id) =>
        await DeleteAsync(id, _catalog.GetPatchCableByIdAsync, _catalog.CountPatchCableReferencesAsync, _catalog.DeletePatchCableAsync, "patch kablosu");

    // --- Alıcı kart ---
    [HttpGet("receiving-cards")]
    public async Task<ActionResult<IEnumerable<ReceivingCard>>> GetReceivingCards() =>
        Ok(await _catalog.GetReceivingCardsAsync());

    [HttpGet("receiving-cards/{id:int}")]
    public async Task<ActionResult<ReceivingCard>> GetReceivingCard(int id) =>
        GetById(await _catalog.GetReceivingCardByIdAsync(id));

    [AdminOnly]
    [HttpPost("receiving-cards")]
    public async Task<ActionResult<ReceivingCard>> CreateReceivingCard([FromBody] HardwareComponentInputDto input)
    {
        var error = Validate(input);
        if (error is not null) return BadRequest(new { message = error });
        var created = await _catalog.CreateReceivingCardAsync(Apply(input, new ReceivingCard()));
        return CreatedAtAction(nameof(GetReceivingCard), new { id = created.Id }, created);
    }

    [AdminOnly]
    [HttpPut("receiving-cards/{id:int}")]
    public async Task<ActionResult<ReceivingCard>> UpdateReceivingCard(int id, [FromBody] HardwareComponentInputDto input)
    {
        var existing = await _catalog.GetReceivingCardByIdAsync(id);
        if (existing is null) return NotFound();
        var error = Validate(input);
        if (error is not null) return BadRequest(new { message = error });
        Apply(input, existing);
        await _catalog.UpdateReceivingCardAsync(existing);
        return Ok(existing);
    }

    [AdminOnly]
    [HttpDelete("receiving-cards/{id:int}")]
    public async Task<IActionResult> DeleteReceivingCard(int id) =>
        await DeleteAsync(id, _catalog.GetReceivingCardByIdAsync, _catalog.CountReceivingCardReferencesAsync, _catalog.DeleteReceivingCardAsync, "alıcı kart");

    // --- İşlemci ---
    [HttpGet("processors")]
    public async Task<ActionResult<IEnumerable<Processor>>> GetProcessors() =>
        Ok(await _catalog.GetProcessorsAsync());

    [HttpGet("processors/{id:int}")]
    public async Task<ActionResult<Processor>> GetProcessor(int id) =>
        GetById(await _catalog.GetProcessorByIdAsync(id));

    [AdminOnly]
    [HttpPost("processors")]
    public async Task<ActionResult<Processor>> CreateProcessor([FromBody] HardwareComponentInputDto input)
    {
        var error = Validate(input);
        if (error is not null) return BadRequest(new { message = error });
        var created = await _catalog.CreateProcessorAsync(Apply(input, new Processor()));
        return CreatedAtAction(nameof(GetProcessor), new { id = created.Id }, created);
    }

    [AdminOnly]
    [HttpPut("processors/{id:int}")]
    public async Task<ActionResult<Processor>> UpdateProcessor(int id, [FromBody] HardwareComponentInputDto input)
    {
        var existing = await _catalog.GetProcessorByIdAsync(id);
        if (existing is null) return NotFound();
        var error = Validate(input);
        if (error is not null) return BadRequest(new { message = error });
        Apply(input, existing);
        await _catalog.UpdateProcessorAsync(existing);
        return Ok(existing);
    }

    [AdminOnly]
    [HttpDelete("processors/{id:int}")]
    public async Task<IActionResult> DeleteProcessor(int id) =>
        await DeleteAsync(id, _catalog.GetProcessorByIdAsync, _catalog.CountProcessorReferencesAsync, _catalog.DeleteProcessorAsync, "işlemci");

    private ActionResult<T> GetById<T>(T? item) where T : class =>
        item is null ? NotFound() : Ok(item);

    private async Task<IActionResult> DeleteAsync<T>(
        int id,
        Func<int, Task<T?>> getById,
        Func<int, Task<int>> countRefs,
        Func<int, Task<bool>> delete,
        string label) where T : class
    {
        if (await getById(id) is null) return NotFound();

        var refs = await countRefs(id);
        if (refs > 0)
        {
            return Conflict(new
            {
                message = $"Bu {label} {refs} kayıtlı proje veya teklifte kullanılıyor. Silmek için önce ilgili kayıtları güncelleyin.",
            });
        }

        await delete(id);
        return NoContent();
    }

    private static string? Validate(HardwareComponentInputDto input)
    {
        if (string.IsNullOrWhiteSpace(input.Name))
            return "Ad boş olamaz.";
        if (input.Price < 0)
            return "Fiyat negatif olamaz.";
        if (input.PowerDrawWatt < 0)
            return "Güç çekişi negatif olamaz.";
        if (input.HeatDissipationBTU < 0)
            return "Isı yayılımı negatif olamaz.";
        if (input.EfficiencyRatio <= 0 || input.EfficiencyRatio > 1)
            return "Verim oranı 0'dan büyük ve en fazla 1 olmalıdır (ör. 0.92 = %92).";
        return null;
    }

    private static T Apply<T>(HardwareComponentInputDto input, T item) where T : HardwareComponent
    {
        item.Name = input.Name.Trim();
        item.Model = string.IsNullOrWhiteSpace(input.Model) ? null : input.Model.Trim();
        item.Price = input.Price;
        item.PowerDrawWatt = input.PowerDrawWatt;
        item.HeatDissipationBTU = input.HeatDissipationBTU;
        item.EfficiencyRatio = input.EfficiencyRatio;
        return item;
    }
}
