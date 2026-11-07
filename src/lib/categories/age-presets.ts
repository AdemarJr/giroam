export type AgeCategoryPreset = {
  name: string;
  description: string;
  minAge: number;
  maxAge: number | null;
  gender: string | null;
  sortOrder: number;
};

/** Categorias etárias padrão por modalidade (cada campeonato recebe as suas). */
export function ageCategoryPresetsForModality(
  modality: string,
): AgeCategoryPreset[] {
  const m = modality.toLowerCase();

  if (m.includes("tri")) {
    return [
      {
        name: "Juvenil 15–17",
        description: "Atletas de 15 a 17 anos",
        minAge: 15,
        maxAge: 17,
        gender: null,
        sortOrder: 10,
      },
      {
        name: "Junior 18–19",
        description: "Atletas de 18 a 19 anos",
        minAge: 18,
        maxAge: 19,
        gender: null,
        sortOrder: 20,
      },
      {
        name: "Elite 20–39",
        description: "Categoria elite 20 a 39 anos",
        minAge: 20,
        maxAge: 39,
        gender: null,
        sortOrder: 30,
      },
      {
        name: "Master 40–49",
        description: "Master A",
        minAge: 40,
        maxAge: 49,
        gender: null,
        sortOrder: 40,
      },
      {
        name: "Master 50–59",
        description: "Master B",
        minAge: 50,
        maxAge: 59,
        gender: null,
        sortOrder: 50,
      },
      {
        name: "Master 60+",
        description: "Master C e acima",
        minAge: 60,
        maxAge: null,
        gender: null,
        sortOrder: 60,
      },
      {
        name: "Feminino Elite 18–39",
        description: "Feminino 18 a 39 anos",
        minAge: 18,
        maxAge: 39,
        gender: "F",
        sortOrder: 70,
      },
      {
        name: "Feminino Master 40+",
        description: "Feminino 40 anos ou mais",
        minAge: 40,
        maxAge: null,
        gender: "F",
        sortOrder: 80,
      },
    ];
  }

  // Ciclismo / MTB / gravel (padrão)
  return [
    {
      name: "Infantil Sub-13",
      description: "Até 12 anos completos",
      minAge: 8,
      maxAge: 12,
      gender: null,
      sortOrder: 10,
    },
    {
      name: "Infantojuvenil Sub-15",
      description: "13 a 14 anos",
      minAge: 13,
      maxAge: 14,
      gender: null,
      sortOrder: 20,
    },
    {
      name: "Juvenil Sub-17",
      description: "15 a 16 anos",
      minAge: 15,
      maxAge: 16,
      gender: null,
      sortOrder: 30,
    },
    {
      name: "Junior Sub-19",
      description: "17 a 18 anos",
      minAge: 17,
      maxAge: 18,
      gender: null,
      sortOrder: 40,
    },
    {
      name: "Elite 19–29",
      description: "19 a 29 anos",
      minAge: 19,
      maxAge: 29,
      gender: null,
      sortOrder: 50,
    },
    {
      name: "Master A 30–39",
      description: "30 a 39 anos",
      minAge: 30,
      maxAge: 39,
      gender: null,
      sortOrder: 60,
    },
    {
      name: "Master B 40–49",
      description: "40 a 49 anos",
      minAge: 40,
      maxAge: 49,
      gender: null,
      sortOrder: 70,
    },
    {
      name: "Master C 50–59",
      description: "50 a 59 anos",
      minAge: 50,
      maxAge: 59,
      gender: null,
      sortOrder: 80,
    },
    {
      name: "Master D 60+",
      description: "60 anos ou mais",
      minAge: 60,
      maxAge: null,
      gender: null,
      sortOrder: 90,
    },
    {
      name: "Feminino Elite 15–39",
      description: "Feminino 15 a 39 anos",
      minAge: 15,
      maxAge: 39,
      gender: "F",
      sortOrder: 100,
    },
    {
      name: "Feminino Master 40+",
      description: "Feminino 40 anos ou mais",
      minAge: 40,
      maxAge: null,
      gender: "F",
      sortOrder: 110,
    },
  ];
}

export function formatAgeRange(minAge: number | null, maxAge: number | null) {
  if (minAge == null && maxAge == null) return "Livre";
  if (minAge != null && maxAge == null) return `${minAge}+ anos`;
  if (minAge == null && maxAge != null) return `até ${maxAge} anos`;
  return `${minAge}–${maxAge} anos`;
}

export function ageFromBirthDate(birthDate: string | Date, on = new Date()) {
  const birth =
    typeof birthDate === "string" ? new Date(`${birthDate}T12:00:00`) : birthDate;
  let age = on.getFullYear() - birth.getFullYear();
  const m = on.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && on.getDate() < birth.getDate())) age -= 1;
  return age;
}

export function categoryMatchesAge(
  age: number,
  minAge: number | null,
  maxAge: number | null,
) {
  if (minAge != null && age < minAge) return false;
  if (maxAge != null && age > maxAge) return false;
  return true;
}
