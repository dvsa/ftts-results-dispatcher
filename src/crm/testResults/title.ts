export enum CrmTitle {
  Mr = 675030000,
  Ms = 675030001,
  Mx = 675030002,
  Mrs = 675030003,
  Miss = 675030004,
  Dr = 675030005,
}

export enum Title {
  Mr = 'Mr',
  Ms = 'Ms',
  Mx = 'Mx',
  Mrs = 'Mrs',
  Miss = 'Miss',
  Dr = 'Dr',
}

export function crmTitleToTitle(crmTitle: CrmTitle | undefined): Title | undefined {
  switch (crmTitle) {
    case CrmTitle.Mr: return Title.Mr;
    case CrmTitle.Miss: return Title.Miss;
    case CrmTitle.Mrs: return Title.Mrs;
    case CrmTitle.Ms: return Title.Ms;
    case CrmTitle.Mx: return Title.Mx;
    case CrmTitle.Dr: return Title.Dr;
    default: return undefined;
  }
}
