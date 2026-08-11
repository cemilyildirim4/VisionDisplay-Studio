using DisplayConfigurator.Application.DTOs;

namespace DisplayConfigurator.Application.Interfaces;

public interface IAnalyticsRepository
{
    Task<DashboardSummaryDto> GetDashboardSummaryAsync();
}
