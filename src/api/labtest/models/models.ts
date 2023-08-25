export interface IKeys {
    name: string;
    displayName: string;
}

export interface IRelation {
    set: any[]
}

export interface ILabTest {
    year: number
    createdAt: string
    updatedAt: string
    Originaleinsendenr: any
    BfR_Isolat_Nr: string
    DB_ID: string
    NRL: string
    ZoMo_Programm: string
    Bericht_e: string
    MRSA_spa_Typ: any
    MRSA_Klonale_Gruppe: any
    Entero_Spez: any
    Campy_Spez: any
    Listeria_Serotyp: any
    STEC_Serotyp: any
    STEC_stx1_Gen: any
    STEC_stx2_Gen: any
    STEC_eae_Gen: any
    STEC_e_hly_Gen: any
    ESBL_AmpC_Carba_Phanotyp: any
    WGS: string
    keine_Gene_oder_Mutationen_gefunden: any
    ESBL_Gene: any
    nicht_ESBL_Beta_Laktamase_Gene: any
    AmpC_Gene: any
    AmpC_Punktmutation: any
    Carbapenemase_Gene: any
    Gene_noch_zu_bestimmen: any
    AK_Res_quant: any
    GEN_Res_quant: string
    KAN_Res_quant: any
    STR_Res_quant: any
    CHL_Res_quant: string
    FFN_Res_quant: any
    PEN_Res_quant: any
    AMP_Res_quant: string
    FOT_Res_quant: string
    FOX_Res_quant: any
    TAZ_Res_quant: string
    MERO_Res_quant: string
    CIP_Res_quant: string
    NAL_Res_quant: string
    COL_Res_quant: string
    TET_Res_quant: string
    TGC_Res_quant: string
    RIF_Res_quant: any
    CLI_Res_quant: any
    AZI_Res_quant: string
    ERY_Res_quant: any
    TEC_Res_quant: any
    VAN_Res_quant: any
    DAP_Res_quant: any
    LZD_Res_quant: any
    TIA_Res_quant: any
    MUP_Res_quant: any
    SYN_Res_quant: any
    FUS_Res_quant: any
    TMP_Res_quant: string
    SMX_Res_quant: string
    AK_Res_qual: string
    GEN_Res_qual: string
    KAN_Res_qual: string
    STR_Res_qual: string
    CHL_Res_qual: string
    FFN_Res_qual: string
    PEN_Res_qual: string
    AMP_Res_qual: string
    FOT_Res_qual: string
    FOX_Res_qual: string
    TAZ_Res_qual: string
    MERO_Res_qual: string
    CIP_Res_qual: string
    NAL_Res_qual: string
    COL_Res_qual: string
    TET_Res_qual: string
    TGC_Res_qual: string
    RIF_Res_qual: string
    CLI_Res_qual: string
    AZI_Res_qual: string
    ERY_Res_qual: string
    TEC_Res_qual: string
    VAN_Res_qual: string
    DAP_Res_qual: string
    LZD_Res_qual: string
    TIA_Res_qual: string
    MUP_Res_qual: string
    SYN_Res_qual: string
    FUS_Res_qual: string
    TMP_Res_qual: string
    SMX_Res_qual: string
    state: IRelation
    microorganism: IRelation
    objective: IRelation
    sampling_point: IRelation
    sampling_origin: IRelation
    animal_species_food_upper_category: IRelation
    animal_species_production_direction_food: IRelation
    matrix: IRelation
    matrix_detail: IRelation
    salmonella: IRelation
}

export class LabTest implements ILabTest {

    constructor(data: Partial<ILabTest>) {
        Object.assign(this, data);
    }
    state: IRelation;
    microorganism: IRelation;
    objective: IRelation;
    sampling_point: IRelation;
    sampling_origin: IRelation;
    animal_species_food_upper_category: IRelation;
    animal_species_production_direction_food: IRelation;
    matrix: IRelation;
    matrix_detail: IRelation;
    salmonella: IRelation;
    year: number;
    createdAt: string;
    updatedAt: string;
    Originaleinsendenr: any;
    BfR_Isolat_Nr: string;
    DB_ID: string;
    NRL: string;
    ZoMo_Programm: string;
    Bericht_e: string;
    MRSA_spa_Typ: any;
    MRSA_Klonale_Gruppe: any;
    Entero_Spez: any;
    Campy_Spez: any;
    Listeria_Serotyp: any;
    STEC_Serotyp: any;
    STEC_stx1_Gen: any;
    STEC_stx2_Gen: any;
    STEC_eae_Gen: any;
    STEC_e_hly_Gen: any;
    ESBL_AmpC_Carba_Phanotyp: any;
    WGS: string;
    keine_Gene_oder_Mutationen_gefunden: any;
    ESBL_Gene: any;
    nicht_ESBL_Beta_Laktamase_Gene: any;
    AmpC_Gene: any;
    AmpC_Punktmutation: any;
    Carbapenemase_Gene: any;
    Gene_noch_zu_bestimmen: any;
    AK_Res_quant: any;
    GEN_Res_quant: string;
    KAN_Res_quant: any;
    STR_Res_quant: any;
    CHL_Res_quant: string;
    FFN_Res_quant: any;
    PEN_Res_quant: any;
    AMP_Res_quant: string;
    FOT_Res_quant: string;
    FOX_Res_quant: any;
    TAZ_Res_quant: string;
    MERO_Res_quant: string;
    CIP_Res_quant: string;
    NAL_Res_quant: string;
    COL_Res_quant: string;
    TET_Res_quant: string;
    TGC_Res_quant: string;
    RIF_Res_quant: any;
    CLI_Res_quant: any;
    AZI_Res_quant: string;
    ERY_Res_quant: any;
    TEC_Res_quant: any;
    VAN_Res_quant: any;
    DAP_Res_quant: any;
    LZD_Res_quant: any;
    TIA_Res_quant: any;
    MUP_Res_quant: any;
    SYN_Res_quant: any;
    FUS_Res_quant: any;
    TMP_Res_quant: string;
    SMX_Res_quant: string;
    AK_Res_qual: string;
    GEN_Res_qual: string;
    KAN_Res_qual: string;
    STR_Res_qual: string;
    CHL_Res_qual: string;
    FFN_Res_qual: string;
    PEN_Res_qual: string;
    AMP_Res_qual: string;
    FOT_Res_qual: string;
    FOX_Res_qual: string;
    TAZ_Res_qual: string;
    MERO_Res_qual: string;
    CIP_Res_qual: string;
    NAL_Res_qual: string;
    COL_Res_qual: string;
    TET_Res_qual: string;
    TGC_Res_qual: string;
    RIF_Res_qual: string;
    CLI_Res_qual: string;
    AZI_Res_qual: string;
    ERY_Res_qual: string;
    TEC_Res_qual: string;
    VAN_Res_qual: string;
    DAP_Res_qual: string;
    LZD_Res_qual: string;
    TIA_Res_qual: string;
    MUP_Res_qual: string;
    SYN_Res_qual: string;
    FUS_Res_qual: string;
    TMP_Res_qual: string;
    SMX_Res_qual: string;

}