using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Application.Interfaces;

public interface IInviteCodeRepository
{
    Task<InviteCode?> GetByCodeAsync(string code);
    Task<bool> TryRedeemAsync(string code, string? userName);
    Task<IEnumerable<InviteCode>> GetAllAsync();
    Task<InviteCode> CreateAsync(InviteCode invite);
    /// <summary>Kullanım hakkını günceller; güncellenen kaydı döner.</summary>
    Task<InviteCode?> UpdateMaxUsesAsync(int id, int maxUses);

    Task<bool> DeleteAsync(int id);
}
