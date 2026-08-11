using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Application.Interfaces;

public interface IChatLogRepository
{
    /// <summary>onlyUnanswered=true iken yalnızca yardımcının cevaplayamadığı soruları döner —
    /// bilgi tabanına eklenmesi gereken konuları bulmak için.</summary>
    Task<IEnumerable<ChatLog>> GetAllAsync(int limit, bool onlyUnanswered = false);
    Task<ChatLog> CreateAsync(ChatLog chatLog);
}
