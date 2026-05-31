namespace ReportingService;

public static class SeedData
{
    public static readonly Student[] Students =
    {
        new("STU001", "Wisdom Uwaga",     "Cloud Engineering",  "Active"),
        new("STU002", "Bolarinwa Akinde", "Cloud Engineering",  "Active"),
        new("STU003", "Ayobami Edun",     "DevOps Engineering", "Active"),
        new("STU004", "Osahon Igbogbo",   "Cloud Engineering",  "Active"),
        new("STU005", "Emmanuel Ohuoha",  "DevOps Engineering", "Active"),
        new("STU006", "Adaeze Okafor",    "Cloud Security",     "Active"),
        new("STU007", "Chukwudi Eze",     "Cloud Engineering",  "Active"),
        new("STU008", "Fatima Bello",     "DevOps Engineering", "Active"),
        new("STU009", "Tunde Adesanya",   "Cloud Engineering",  "Inactive"),
        new("STU010", "Ngozi Obi",        "Cloud Security",     "Active"),
    };

    public static readonly Course[] Courses =
    {
        new("CLO101", "CLO101", "Cloud Engineering Fundamentals"),
        new("DEV201", "DEV201", "DevOps & CI/CD Pipelines"),
        new("PY301",  "PY301",  "Python for Cloud Automation"),
        new("NET401", "NET401", "Networking & Security Fundamentals"),
        new("LNX101", "LNX101", "Linux Systems Administration"),
        new("SEC201", "SEC201", "Cloud Security & Compliance"),
    };

    public static readonly Enrolment[] Enrolments =
    {
        new("STU001", "CLO101", "A"), new("STU001", "DEV201", "A"), new("STU001", "PY301",  "B"),
        new("STU002", "CLO101", "A"), new("STU002", "DEV201", "B"), new("STU002", "NET401", "A"),
        new("STU003", "CLO101", "B"), new("STU003", "DEV201", "A"), new("STU003", "PY301",  "A"),
        new("STU004", "CLO101", "B"), new("STU004", "LNX101", "B"), new("STU004", "SEC201", "C"),
        new("STU005", "CLO101", "A"), new("STU005", "DEV201", "A"), new("STU005", "NET401", "B"),
        new("STU006", "PY301",  "C"), new("STU006", "LNX101", "B"), new("STU006", "SEC201", "B"),
        new("STU007", "CLO101", "A"), new("STU007", "DEV201", "A"), new("STU007", "SEC201", "A"),
        new("STU008", "PY301",  "B"), new("STU008", "NET401", "B"), new("STU008", "LNX101", "A"),
        new("STU009", "CLO101", "C"), new("STU009", "DEV201", "C"),
        new("STU010", "CLO101", "A"), new("STU010", "DEV201", "B"),
        new("STU010", "PY301",  "A"), new("STU010", "NET401", "A"),
    };
}
