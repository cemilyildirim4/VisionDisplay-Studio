using Dapper;
using DisplayConfigurator.Application.Interfaces;
using DisplayConfigurator.Domain.Entities;

namespace DisplayConfigurator.Infrastructure.Repositories;

public class ChatLogRepository : IChatLogRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public ChatLogRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IEnumerable<ChatLog>> GetAllAsync(int limit, bool onlyUnanswered = false)
    {
        using var connection = _connectionFactory.CreateConnection();
        string sql = $@"
            SELECT
                id AS Id,
                question AS Question,
                topic_id AS TopicId,
                answered AS Answered,
                lang AS Lang,
                created_at AS CreatedAt
            FROM chat_logs
            {(onlyUnanswered ? "WHERE answered = false" : string.Empty)}
            ORDER BY created_at DESC
            LIMIT @Limit";

        return await connection.QueryAsync<ChatLog>(sql, new { Limit = limit });
    }

    public async Task<ChatLog> CreateAsync(ChatLog chatLog)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = @"
            INSERT INTO chat_logs (question, topic_id, answered, lang, created_at)
            VALUES (@Question, @TopicId, @Answered, @Lang, NOW())
            RETURNING id;";

        var id = await connection.ExecuteScalarAsync<int>(sql, chatLog);
        chatLog.Id = id;
        return chatLog;
    }
}
