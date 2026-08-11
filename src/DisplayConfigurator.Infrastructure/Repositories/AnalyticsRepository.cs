using Dapper;
using DisplayConfigurator.Application.DTOs;
using DisplayConfigurator.Application.Interfaces;

namespace DisplayConfigurator.Infrastructure.Repositories;

public class AnalyticsRepository : IAnalyticsRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public AnalyticsRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<DashboardSummaryDto> GetDashboardSummaryAsync()
    {
        using var connection = _connectionFactory.CreateConnection();

        var totalQuotes = await connection.ExecuteScalarAsync<int>("SELECT COUNT(1) FROM quotes");
        var pendingQuotes = await connection.ExecuteScalarAsync<int>("SELECT COUNT(1) FROM quotes WHERE status = 'Beklemede'");
        var totalConfigurations = await connection.ExecuteScalarAsync<int>("SELECT COUNT(1) FROM configurations");
        var unansweredChatLogs = await connection.ExecuteScalarAsync<int>("SELECT COUNT(1) FROM chat_logs WHERE answered = false");

        const string topModelsSql = @"
            SELECT cab.id AS CabinId, cab.model_code AS ModelCode, COUNT(cfg.id) AS ConfigurationCount
            FROM configurations cfg
            JOIN cabins cab ON cfg.cabin_id = cab.id
            GROUP BY cab.id, cab.model_code
            ORDER BY COUNT(cfg.id) DESC
            LIMIT 5";
        var topModels = await connection.QueryAsync<TopModelDto>(topModelsSql);

        // Aynı soru farklı kelimelerle sorulabildiği için birebir metin eşleşmesi
        // ideal değil, ama harici bir NLP/embedding servisi olmadan (bkz. rapor —
        // "Geliştirme Önerileri") en pratik başlangıç noktası budur.
        const string faqSql = @"
            SELECT question AS Question, COUNT(1) AS AskedCount, MIN(topic_id) AS TopicId
            FROM chat_logs
            WHERE answered = false
            GROUP BY question
            ORDER BY COUNT(1) DESC, MIN(created_at) DESC
            LIMIT 10";
        var faqSuggestions = await connection.QueryAsync<FaqSuggestionDto>(faqSql);

        return new DashboardSummaryDto
        {
            TotalQuotes = totalQuotes,
            PendingQuotes = pendingQuotes,
            TotalConfigurations = totalConfigurations,
            UnansweredChatLogs = unansweredChatLogs,
            TopModels = topModels,
            FaqSuggestions = faqSuggestions,
        };
    }
}
