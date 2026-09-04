using DisplayConfigurator.Api.Security;
using DisplayConfigurator.Application.DTOs;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace DisplayConfigurator.Api.Controllers;

/// <summary>
/// Admin katalog CRUD: güç kaynağı, mini PC, patch kablosu, alıcı kart, işlemci.
/// Liste/GET herkese açık (konfigüratör); yazma yalnızca Admin.
/// Her tip kendi DTO ve doğrulama kurallarını kullanır.
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
    public async Task<ActionResult<PowerSupply>> CreatePowerSupply([FromBody] PowerSupplyInputDto input)
    {
        var error = ValidatePowerSupply(input);
        if (error is not null) return BadRequest(new { message = error });
        var created = await _catalog.CreatePowerSupplyAsync(Apply(input, new PowerSupply()));
        return CreatedAtAction(nameof(GetPowerSupply), new { id = created.Id }, created);
    }

    [AdminOnly]
    [HttpPut("power-supplies/{id:int}")]
    public async Task<ActionResult<PowerSupply>> UpdatePowerSupply(int id, [FromBody] PowerSupplyInputDto input)
    {
        var existing = await _catalog.GetPowerSupplyByIdAsync(id);
        if (existing is null) return NotFound();
        var error = ValidatePowerSupply(input);
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
    public async Task<ActionResult<MiniPc>> CreateMiniPc([FromBody] MiniPcInputDto input)
    {
        var error = ValidateMiniPc(input);
        if (error is not null) return BadRequest(new { message = error });
        var created = await _catalog.CreateMiniPcAsync(Apply(input, new MiniPc()));
        return CreatedAtAction(nameof(GetMiniPc), new { id = created.Id }, created);
    }

    [AdminOnly]
    [HttpPut("mini-pcs/{id:int}")]
    public async Task<ActionResult<MiniPc>> UpdateMiniPc(int id, [FromBody] MiniPcInputDto input)
    {
        var existing = await _catalog.GetMiniPcByIdAsync(id);
        if (existing is null) return NotFound();
        var error = ValidateMiniPc(input);
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
    public async Task<ActionResult<PatchCable>> CreatePatchCable([FromBody] PatchCableInputDto input)
    {
        var error = ValidatePatchCable(input);
        if (error is not null) return BadRequest(new { message = error });
        var created = await _catalog.CreatePatchCableAsync(Apply(input, new PatchCable()));
        return CreatedAtAction(nameof(GetPatchCable), new { id = created.Id }, created);
    }

    [AdminOnly]
    [HttpPut("patch-cables/{id:int}")]
    public async Task<ActionResult<PatchCable>> UpdatePatchCable(int id, [FromBody] PatchCableInputDto input)
    {
        var existing = await _catalog.GetPatchCableByIdAsync(id);
        if (existing is null) return NotFound();
        var error = ValidatePatchCable(input);
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
    public async Task<ActionResult<ReceivingCard>> CreateReceivingCard([FromBody] ReceivingCardInputDto input)
    {
        var error = ValidateReceivingCard(input);
        if (error is not null) return BadRequest(new { message = error });
        var created = await _catalog.CreateReceivingCardAsync(Apply(input, new ReceivingCard()));
        return CreatedAtAction(nameof(GetReceivingCard), new { id = created.Id }, created);
    }

    [AdminOnly]
    [HttpPut("receiving-cards/{id:int}")]
    public async Task<ActionResult<ReceivingCard>> UpdateReceivingCard(int id, [FromBody] ReceivingCardInputDto input)
    {
        var existing = await _catalog.GetReceivingCardByIdAsync(id);
        if (existing is null) return NotFound();
        var error = ValidateReceivingCard(input);
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
    public async Task<ActionResult<Processor>> CreateProcessor([FromBody] ProcessorInputDto input)
    {
        var error = ValidateProcessor(input);
        if (error is not null) return BadRequest(new { message = error });
        var created = await _catalog.CreateProcessorAsync(Apply(input, new Processor()));
        return CreatedAtAction(nameof(GetProcessor), new { id = created.Id }, created);
    }

    [AdminOnly]
    [HttpPut("processors/{id:int}")]
    public async Task<ActionResult<Processor>> UpdateProcessor(int id, [FromBody] ProcessorInputDto input)
    {
        var existing = await _catalog.GetProcessorByIdAsync(id);
        if (existing is null) return NotFound();
        var error = ValidateProcessor(input);
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

    private static string? ValidateBase(HardwareComponentInputDto input)
    {
        if (string.IsNullOrWhiteSpace(input.Name))
            return "Ad boş olamaz.";
        if (input.Price < 0)
            return "Fiyat negatif olamaz.";
        return null;
    }

    private static decimal NormalizeEfficiency(decimal value)
    {
        if (value > 1m && value <= 100m) return Math.Round(value / 100m, 4);
        return value;
    }

    private static string? ValidatePowerSupply(PowerSupplyInputDto input)
    {
        var err = ValidateBase(input);
        if (err is not null) return err;
        if (input.OutputVoltage < 0) return "Çıkış gerilimi negatif olamaz.";
        if (input.MaxPowerOutputWatt < 0) return "Maksimum çıkış gücü negatif olamaz.";
        if (input.HeatDissipationBtu < 0) return "Isı yayılımı negatif olamaz.";
        if (input.Amperage < 0) return "Amper değeri negatif olamaz.";
        var eta = NormalizeEfficiency(input.EfficiencyRatio);
        if (eta <= 0 || eta > 1)
            return "Verim oranı 0'dan büyük ve en fazla %100 olmalıdır.";
        return null;
    }

    private static string? ValidateMiniPc(MiniPcInputDto input)
    {
        var err = ValidateBase(input);
        if (err is not null) return err;
        if (input.PowerDrawWatt < 0) return "Güç çekişi negatif olamaz.";
        return null;
    }

    private static string? ValidatePatchCable(PatchCableInputDto input)
    {
        var err = ValidateBase(input);
        if (err is not null) return err;
        if (input.LengthMeters < 0) return "Kablo uzunluğu negatif olamaz.";
        return null;
    }

    private static string? ValidateReceivingCard(ReceivingCardInputDto input)
    {
        var err = ValidateBase(input);
        if (err is not null) return err;
        if (input.MaxPixelWidth < 0 || input.MaxPixelHeight < 0)
            return "Piksel kapasitesi negatif olamaz.";
        if (input.HubPortCount < 0) return "Hub port sayısı negatif olamaz.";
        if (input.PowerDrawWatt < 0) return "Güç çekişi negatif olamaz.";
        return null;
    }

    private static string? ValidateProcessor(ProcessorInputDto input)
    {
        var err = ValidateBase(input);
        if (err is not null) return err;
        if (input.MaxPixelCapacityPerPort < 0) return "Port başı piksel kapasitesi negatif olamaz.";
        if (input.MaxPortWidth < 0 || input.MaxPortHeight < 0)
            return "Port genişlik/yükseklik negatif olamaz.";
        if (input.EthernetPortCount < 0) return "Ethernet port sayısı negatif olamaz.";
        if (input.PowerDrawWatt < 0) return "Güç çekişi negatif olamaz.";
        return null;
    }

    private static void ApplyBase(HardwareComponentInputDto input, HardwareComponent item)
    {
        item.Name = input.Name.Trim();
        item.Model = string.IsNullOrWhiteSpace(input.Model) ? null : input.Model.Trim();
        item.Price = input.Price;
        item.IsActive = input.IsActive;
    }

    private static string? TrimOrNull(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static PowerSupply Apply(PowerSupplyInputDto input, PowerSupply item)
    {
        ApplyBase(input, item);
        item.OutputVoltage = input.OutputVoltage;
        item.MaxPowerOutputWatt = input.MaxPowerOutputWatt;
        item.EfficiencyRatio = NormalizeEfficiency(input.EfficiencyRatio);
        item.HeatDissipationBtu = input.HeatDissipationBtu;
        item.Amperage = input.Amperage;
        return item;
    }

    private static MiniPc Apply(MiniPcInputDto input, MiniPc item)
    {
        ApplyBase(input, item);
        item.CpuRamInfo = TrimOrNull(input.CpuRamInfo);
        item.Storage = TrimOrNull(input.Storage);
        item.OperatingSystem = TrimOrNull(input.OperatingSystem);
        item.MaxSupportedResolution = TrimOrNull(input.MaxSupportedResolution);
        item.PowerDrawWatt = input.PowerDrawWatt;
        return item;
    }

    private static PatchCable Apply(PatchCableInputDto input, PatchCable item)
    {
        ApplyBase(input, item);
        item.CableType = TrimOrNull(input.CableType);
        item.LengthMeters = input.LengthMeters;
        item.ConnectorType = TrimOrNull(input.ConnectorType);
        return item;
    }

    private static ReceivingCard Apply(ReceivingCardInputDto input, ReceivingCard item)
    {
        ApplyBase(input, item);
        item.MaxPixelWidth = input.MaxPixelWidth;
        item.MaxPixelHeight = input.MaxPixelHeight;
        item.HubPortCount = input.HubPortCount;
        item.PowerDrawWatt = input.PowerDrawWatt;
        return item;
    }

    private static Processor Apply(ProcessorInputDto input, Processor item)
    {
        ApplyBase(input, item);
        item.MaxPixelCapacityPerPort = input.MaxPixelCapacityPerPort > 0
            ? input.MaxPixelCapacityPerPort
            : 650_000;
        item.MaxPortWidth = input.MaxPortWidth > 0 ? input.MaxPortWidth : 4096;
        item.MaxPortHeight = input.MaxPortHeight > 0 ? input.MaxPortHeight : 4096;
        item.EthernetPortCount = input.EthernetPortCount;
        item.InputPortsInfo = TrimOrNull(input.InputPortsInfo);
        item.PowerDrawWatt = input.PowerDrawWatt;
        return item;
    }
}
