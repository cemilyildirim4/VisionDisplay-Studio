using Microsoft.AspNetCore.Mvc;
using DisplayConfigurator.Api.Security;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Api.Controllers;

[ApiController]
[Route("api/chatlogs")]
public class ChatLogsController : ControllerBase
{
    private readonly IChatLogRepository _chatLogRepository;

    public ChatLogsController(IChatLogRepository chatLogRepository)
    {
        _chatLogRepository = chatLogRepository;
    }

    // Yalnızca yönetim ekranı listeler — sohbet kayıtları da kullanıcı sorularını içerir.
    [AdminOnly]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ChatLog>>> GetLogs([FromQuery] int limit = 200, [FromQuery] bool onlyUnanswered = false)
    {
        var take = Math.Clamp(limit, 1, 1000);
        var logs = await _chatLogRepository.GetAllAsync(take, onlyUnanswered);
        return Ok(logs);
    }

    [DevOrBetaWrite]
    [HttpPost]
    public async Task<ActionResult<ChatLog>> CreateLog([FromBody] ChatLog input)
    {
        if (string.IsNullOrWhiteSpace(input.Question))
            return BadRequest("Soru boş olamaz.");

        var log = new ChatLog
        {
            Question = input.Question.Trim()[..Math.Min(input.Question.Trim().Length, 500)],
            TopicId = input.TopicId,
            Answered = input.Answered,
            Lang = input.Lang,
        };

        var created = await _chatLogRepository.CreateAsync(log);
        return Created(string.Empty, created);
    }
}
