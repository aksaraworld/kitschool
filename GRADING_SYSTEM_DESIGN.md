# Indonesian Academic Grading System – Technical Design

## 1. Grading Format per Level

### TK (Kindergarten) – Development-based
| Area | Scale | Meaning |
|------|-------|---------|
| Nilai Agama dan Moral | BB/MB/BSH/BSB | Belum Berkembang, Mulai Berkembang, Berkembang Sesuai Harapan, Berkembang Sangat Baik |
| Sosial Emosional | BB/MB/BSH/BSB | |
| Bahasa | BB/MB/BSH/BSB | |
| Kognitif | BB/MB/BSH/BSB | |
| Fisik Motorik | BB/MB/BSH/BSB | |
| Seni | BB/MB/BSH/BSB | |

### SD (Elementary)
| Component | Weight | Description |
|-----------|--------|-------------|
| PH (Penilaian Harian) | 25% | Daily/quizzes |
| PTS (Penilaian Tengah Semester) | 35% | Mid-term |
| PAS (Penilaian Akhir Semester) | 40% | Final |

### SMP (Junior High)
| Component | Weight | Description |
|-----------|--------|-------------|
| Pengetahuan | 70% | PH + PTS + PAS (weighted) |
| Keterampilan | 30% | Practice/Project |
| Sikap Spiritual | descriptive | SB/B/C/K |
| Sikap Sosial | descriptive | SB/B/C/K |

### SMA (Senior High)
| Component | Weight | Description |
|-----------|--------|-------------|
| UH (Ulangan Harian) | 25% | |
| PTS | 35% | |
| PAS | 40% | |
| Project (optional) | override | |
| Praktikum (optional) | override | |
| Predicate | A/B+/B/C+/C/D/E | From final numeric |

---

## 2. Database Schema (Firestore)

### 2.1 `subjects` (extended)
```ts
{
  schoolId: string;
  name: string;
  code: string;
  categoryId?: string;           // → subjectCategories
  teacherId?: string;            // assigned teacher (uid)
  description?: string;
  isActive: boolean;
  createdAt, updatedAt: Timestamp;
}
```

### 2.2 `subjectCategories` (new)
```ts
{
  schoolId: string;
  name: string;                  // e.g. "Pengetahuan", "Keterampilan", "Muatan Lokal"
  code: string;
  isActive: boolean;
  createdAt, updatedAt: Timestamp;
}
```

### 2.3 `gradingConfigs` (new) – school-level
```ts
{
  schoolId: string;
  level: 'tk' | 'sd' | 'smp' | 'sma' | 'smk';
  name: string;                  // e.g. "Kurikulum Merdeka SMA"
  isActive: boolean;
  components: GradingComponent[]; // weighted components
  attitudeConfig?: AttitudeConfig;
  predicateMappings?: PredicateMapping[];
  createdAt, updatedAt: Timestamp;
}

interface GradingComponent {
  key: string;                   // 'ph' | 'pts' | 'pas' | 'uh' | 'project' | 'practicum'
  label: string;
  weight: number;                // 0-100, sum = 100
  minScore?: number;
  maxScore?: number;
}

interface AttitudeConfig {
  spiritual: { scale: string[] };  // ['SB','B','C','K']
  social: { scale: string[] };
}

interface PredicateMapping {
  minNumeric: number;
  maxNumeric: number;
  letter: string;                // A, B+, B, C+, C, D, E
  description?: string;
}
```

### 2.4 `subjectGradingConfigs` (new) – per-subject override
```ts
{
  schoolId: string;
  subjectId: string;
  gradingConfigId: string;       // → gradingConfigs
  level: string;                 // tk, sd, smp, sma
  componentOverrides?: { key: string; weight: number }[];
  createdAt, updatedAt: Timestamp;
}
```

### 2.5 `tkDevelopmentAreas` (new) – TK only
```ts
{
  schoolId: string;
  gradingConfigId: string;
  areaKey: string;               // 'nilai_agama_moral', 'sosial_emosional', etc.
  label: string;
  scale: string[];               // ['BB','MB','BSH','BSB']
  order: number;
  createdAt, updatedAt: Timestamp;
}
```

### 2.6 `gradeComponents` (new) – individual assessment records
```ts
{
  schoolId: string;
  studentId: string;
  subjectId: string;
  classId?: string;
  yearId: string;
  semester: 1 | 2;
  componentKey: string;          // 'ph', 'pts', 'pas', 'uh', 'project', etc.
  componentLabel?: string;
  numericScore?: number;         // 0-100
  letterScore?: string;
  descriptiveScore?: string;     // BB, MB, BSH, BSB or SB, B, C, K
  maxScore?: number;
  examId?: string;               // optional link to exam
  teacherId?: string;
  notes?: string;
  createdAt, updatedAt: Timestamp;
}
```

### 2.7 `grades` (extended – backward compatible)
```ts
{
  schoolId: string;
  studentId: string;
  subjectId: string;             // ADD (was examId only)
  examId?: string;               // keep for backward compat
  classId?: string;
  yearId: string;
  semester: 1 | 2;
  componentKey?: string;         // ph, pts, pas, etc.
  marksObtained: number;
  maxMarks?: number;
  letterGrade?: string;
  predicate?: string;
  teacherComments?: string;
  isPublished?: boolean;
  // TK: development area grade
  developmentArea?: string;
  descriptiveScore?: string;
  createdAt, updatedAt: Timestamp;
}
```

### 2.8 `schedules` (extend)
```ts
// ADD to existing:
subjectId?: string;              // link schedule slot to subject
```

---

## 3. Entity Relationships

```
School 1──* GradingConfig (level: tk|sd|smp|sma)
School 1──* SubjectCategory
School 1──* Subject ──* SubjectGradingConfig ──1 GradingConfig
Subject ──* Schedule (class)
Subject ──1 User (teacher) [teacherId]
Subject ──* GradeComponent (via subjectId)
Subject ──* Grade (via subjectId)

Student ──* GradeComponent
Student ──* Grade
Class ──* Schedule ──1 Subject
Year ──* Grade, GradeComponent
```

---

## 4. Example Data

### TK Student
```json
{
  "gradeComponents": [
    { "studentId": "s1", "subjectId": "sub_tk_bahasa", "componentKey": "nilai_agama_moral", "descriptiveScore": "BSH", "yearId": "y1", "semester": 1 },
    { "studentId": "s1", "subjectId": "sub_tk_bahasa", "componentKey": "sosial_emosional", "descriptiveScore": "BSB", "yearId": "y1", "semester": 1 }
  ]
}
```

### SMA Student
```json
{
  "gradeComponents": [
    { "studentId": "s2", "subjectId": "sub_matematika", "componentKey": "uh", "numericScore": 85, "yearId": "y1", "semester": 1 },
    { "studentId": "s2", "subjectId": "sub_matematika", "componentKey": "pts", "numericScore": 78, "yearId": "y1", "semester": 1 },
    { "studentId": "s2", "subjectId": "sub_matematika", "componentKey": "pas", "numericScore": 82, "yearId": "y1", "semester": 1 }
  ]
}
```

---

## 5. Final Score Calculation Logic

```ts
// Pseudocode
function calculateFinalScore(
  components: GradeComponent[],
  config: GradingConfig
): { numeric: number; letter: string; predicate: string } {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const c of config.components) {
    const comp = components.find(x => x.componentKey === c.key);
    if (comp?.numericScore != null) {
      weightedSum += (comp.numericScore / (comp.maxScore || 100)) * c.weight;
      totalWeight += c.weight;
    }
  }
  const numeric = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;
  const mapping = config.predicateMappings?.find(
    m => numeric >= m.minNumeric && numeric <= m.maxNumeric
  );
  return {
    numeric,
    letter: mapping?.letter ?? '-',
    predicate: mapping?.description ?? '-'
  };
}
```

---

## 6. Predicate Mapping (SMA default)

| Min | Max | Letter |
|-----|-----|--------|
| 85  | 100 | A      |
| 80  | 84  | B+     |
| 70  | 79  | B      |
| 65  | 69  | C+     |
| 55  | 64  | C      |
| 40  | 54  | D      |
| 0   | 39  | E      |

---

## 7. TK vs Non-TK Separation

```ts
// Grading engine router
function getGradingEngine(level: string) {
  if (level === 'tk') return tkGradingEngine;
  return subjectBasedGradingEngine;
}

// TK: aggregate by development area, no numeric
// SD–SMA: aggregate by subject, weighted numeric → letter
```

---

## 8. Best Practices

1. **No hardcoding**: All scales, weights, predicates stored in `gradingConfigs`.
2. **School-level config**: Each school can override via `gradingConfigs` + `subjectGradingConfigs`.
3. **Modular engine**: `calculateFinalScore(components, config)` is pure function.
4. **Migration**: Add `subjectId`, `componentKey`, `yearId`, `semester` to existing grades; backfill from examId→subjectId mapping.

---

## 9. API Contract Examples

### GET /api/subjects?categoryId=...&teacherId=...
### GET /api/subject-categories
### GET /api/grading-configs?level=sma
### GET /api/grade-components?studentId=...&subjectId=...&yearId=...&semester=1
### POST /api/grade-components
### GET /api/grades/calculated?studentId=...&yearId=...&semester=1&level=sma
  → Returns aggregated final scores per subject with predicate.

---

## 10. Migration Strategy

1. **Add new collections**: `subjectCategories`, `gradingConfigs`, `subjectGradingConfigs`, `gradeComponents`, `tkDevelopmentAreas`.
2. **Extend `subjects`**: Add optional `categoryId`, `teacherId` (no migration; existing docs valid).
3. **Extend `grades`**: Add optional `subjectId`, `yearId`, `semester`, `componentKey`, `letterGrade`, `predicate`, `developmentArea`, `descriptiveScore` (backward compatible).
4. **Extend `schedules`**: Add optional `subjectId` (backward compatible).
5. **Backfill grades**: For grades with `examId`, resolve `subjectId` from exams; optionally create `gradeComponents` from existing grades.
