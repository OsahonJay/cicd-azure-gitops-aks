
using ReportingService;

var builder = WebApplication.CreateBuilder(args);

var allowedOrigin = Environment.GetEnvironmentVariable("ALLOWED_ORIGIN") ?? "";
builder.Services.AddCors(o =>
    o.AddDefaultPolicy(p =>
    {
        if (!string.IsNullOrEmpty(allowedOrigin))
            p.WithOrigins(allowedOrigin).AllowAnyMethod().AllowAnyHeader();
    }));

var app = builder.Build();
app.UseCors();

var apiKey = Environment.GetEnvironmentVariable("API_KEY") ?? "";
app.Use(async (context, next) =>
{
    if (context.Request.Path == "/health" ||
        new[] { "GET", "HEAD", "OPTIONS" }.Contains(context.Request.Method))
    {
        await next(); return;
    }
    if (!context.Request.Headers.TryGetValue("X-API-Key", out var key) || key != apiKey)
    {
        context.Response.StatusCode = 401;
        await context.Response.WriteAsJsonAsync(new { error = "Unauthorized" });
        return;
    }
    await next();
});

var version    = Environment.GetEnvironmentVariable("APP_VERSION") ?? "2.0.0";
var students   = SeedData.Students;
var courses    = SeedData.Courses;
var enrolments = SeedData.Enrolments;

static double GradeToGpa(string grade) => grade switch
{
    "A" => 4.0, "B" => 3.0, "C" => 2.0, "D" => 1.0, _ => 0.0
};


app.MapGet("/health", () =>
    Results.Ok(new { status = "healthy", service = "reporting-service", version }));


app.MapGet("/api/reports/summary", () =>
{
    var activeStudents = students.Count(s => s.Status == "Active");
    var gradeA         = enrolments.Count(e => e.Grade == "A");
    var gradeB         = enrolments.Count(e => e.Grade == "B");
    var gradeC         = enrolments.Count(e => e.Grade == "C");
    var avg            = enrolments.Average(e => GradeToGpa(e.Grade));

    var perCourse = courses
        .Select(c => new
        {
            code  = c.Code,
            name  = c.Name,
            count = enrolments.Count(e => e.CourseId == c.Id),
        })
        .OrderByDescending(x => x.count)
        .ToList();

    return Results.Ok(new
    {
        totalStudents       = students.Length,
        activeStudents,
        totalCourses        = courses.Length,
        totalEnrolments     = enrolments.Length,
        averageGpa          = Math.Round(avg, 2),
        gradeDistribution   = new { A = gradeA, B = gradeB, C = gradeC },
        enrolmentsPerCourse = perCourse,
    });
});


app.MapGet("/api/reports/top-students", () =>
{
    var result = students
        .Where(s => s.Status == "Active")
        .Select(s =>
        {
            var mine = enrolments.Where(e => e.StudentId == s.Id).ToList();
            var gpa  = mine.Count > 0 ? mine.Average(e => GradeToGpa(e.Grade)) : 0.0;
            return new
            {
                id          = s.Id,
                name        = s.Name,
                programme   = s.Programme,
                gpa         = Math.Round(gpa, 2),
                courseCount = mine.Count,
            };
        })
        .OrderByDescending(x => x.gpa)
        .Take(5)
        .ToList();

    return Results.Ok(result);
});


app.MapGet("/api/reports/student/{id}", (string id) =>
{
    var student = students.FirstOrDefault(s => s.Id == id);
    if (student is null) return Results.NotFound(new { error = "Student not found" });

    var mine = enrolments.Where(e => e.StudentId == id).ToList();
    var gpa  = mine.Count > 0 ? mine.Average(e => GradeToGpa(e.Grade)) : 0.0;

    var detail = mine.Select(e =>
    {
        var course = courses.FirstOrDefault(c => c.Id == e.CourseId);
        return new
        {
            courseId   = e.CourseId,
            courseName = course?.Name ?? e.CourseId,
            grade      = e.Grade,
            gpaPoints  = GradeToGpa(e.Grade),
        };
    }).ToList();

    return Results.Ok(new
    {
        id        = student.Id,
        name      = student.Name,
        programme = student.Programme,
        status    = student.Status,
        gpa       = Math.Round(gpa, 2),
        courses   = detail,
    });
});

app.MapGet("/api/reports/course/{id}", (string id) =>
{
    var course = courses.FirstOrDefault(c => c.Id == id);
    if (course is null) return Results.NotFound(new { error = "Course not found" });

    var enrolled = enrolments.Where(e => e.CourseId == id).ToList();
    var gradeMap = new Dictionary<string, int> { { "A", 0 }, { "B", 0 }, { "C", 0 } };
    foreach (var e in enrolled)
        if (gradeMap.ContainsKey(e.Grade)) gradeMap[e.Grade]++;

    var avg      = enrolled.Count > 0 ? enrolled.Average(e => GradeToGpa(e.Grade)) : 0.0;
    var passRate = enrolled.Count > 0
        ? Math.Round(100.0 * enrolled.Count(e => e.Grade is "A" or "B") / enrolled.Count, 1)
        : 0.0;

    return Results.Ok(new
    {
        id                = course.Id,
        code              = course.Code,
        name              = course.Name,
        enrolledCount     = enrolled.Count,
        averageGpa        = Math.Round(avg, 2),
        passRate,
        gradeDistribution = gradeMap,
    });
});


app.Run();
