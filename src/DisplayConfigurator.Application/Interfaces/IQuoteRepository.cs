using DisplayConfigurator.Application.DTOs;
using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Application.Interfaces;

public interface IQuoteRepository
{
    Task<PagedResultDto<Quote>> GetPagedAsync(PagedQueryDto query);
    Task<IEnumerable<Quote>> GetByUserIdAsync(int userId);
    Task<Quote> CreateAsync(Quote quote);
    Task SetPreviewImageAsync(int id, byte[] image);
    Task<bool> DeleteAsync(int id);
    Task<bool> UpdateStatusAsync(int id, string status, string? adminNote);
}
