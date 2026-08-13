using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Application.Interfaces;

public interface IFeedbackRepository
{
    Task<IEnumerable<FeedbackReport>> GetAllAsync(int limit, bool onlyOpen = false);
    Task<FeedbackReport> CreateAsync(FeedbackReport report);
    Task<bool> SetResolvedAsync(int id, bool resolved);
    Task<bool> DeleteAsync(int id);
}
