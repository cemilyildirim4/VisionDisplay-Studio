using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Application.Interfaces;

public interface IInviteCodeRepository
{
    Task<InviteCode?> GetByCodeAsync(string code);
    Task<bool> TryRedeemAsync(string code, string? userName);
    Task<IEnumerable<InviteCode>> GetAllAsync();
    Task<InviteCode> CreateAsync(InviteCode invite);
    Task<bool> DeleteAsync(int id);
}
