namespace ReportingService;

public record Student(string Id, string Name, string Programme, string Status);
public record Course(string Id, string Code, string Name);
public record Enrolment(string StudentId, string CourseId, string Grade);
