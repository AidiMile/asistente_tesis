import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-modismos',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  template: `
    <div class="flex h-screen bg-[#0b0f19] text-slate-100 overflow-hidden">
      <app-sidebar></app-sidebar>

      <main class="ml-64 flex-1 flex flex-col h-screen overflow-y-auto px-10 py-8 bg-[#0b0f19]">
        
        <!-- Header -->
        <div class="flex items-center justify-between pb-6 border-b border-[#1e293b]/60 mb-6">
          <div>
            <h1 class="text-xl font-bold text-white tracking-tight">Diccionario y Corpus Dialectal Ecuatoriano</h1>
            <p class="text-xs text-slate-400 mt-1">Base de conocimiento lingüístico UPEC (Tablas 6 y 7 de la Tesis)</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-3 py-1.5 rounded-xl bg-sky-500/10 text-sky-400 text-xs border border-sky-500/20 font-mono">
              {{ modismosList.length }} Expresiones Indexadas
            </span>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="flex items-center gap-4 mb-6">
          <div class="relative flex-1">
            <input 
              type="text" 
              [(ngModel)]="searchQuery" 
              placeholder="Buscar modismo, significado o ejemplo..." 
              class="input-field pl-11 py-2.5 text-xs"
            />
            <i class="bi bi-search absolute left-4 top-3 text-slate-400"></i>
          </div>

          <select [(ngModel)]="selectedRegion" class="input-field py-2.5 px-4 text-xs w-48">
            <option value="">Todas las regiones</option>
            <option value="Sierra">Sierra</option>
            <option value="Carchi">Carchi</option>
            <option value="Costa">Costa</option>
            <option value="Nacional">Nacional</option>
          </select>
        </div>

        <!-- Modisms Grid / Table -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pb-12">
          <div *ngFor="let item of filteredModismos" class="p-5 rounded-2xl bg-[#131d31] border border-[#1e293b] hover:border-sky-500/40 transition-all shadow-md space-y-3">
            <div class="flex items-start justify-between">
              <div>
                <h3 class="text-base font-bold text-sky-400 font-mono">{{ item.nombre_modismo }}</h3>
                <span class="text-[11px] text-slate-400">{{ item.region }}</span>
              </div>
              <span class="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {{ item.estado || 'Activo' }}
              </span>
            </div>

            <div class="text-xs text-slate-300 leading-relaxed bg-[#0b0f19]/60 p-3 rounded-xl border border-[#1e293b]/60">
              <span class="text-slate-400 block text-[10px] uppercase font-semibold mb-1">Significado:</span>
              <p>{{ getSignificado(item) }}</p>
            </div>

            <div *ngIf="getEjemplo(item)" class="text-xs text-slate-400 italic bg-sky-950/20 p-2.5 rounded-xl border border-sky-900/30">
              <span class="text-sky-400 font-normal not-italic text-[10px] block mb-0.5">Ejemplo de uso:</span>
              "{{ getEjemplo(item) }}"
            </div>
          </div>
        </div>

      </main>
    </div>
  `
})
export class ModismosComponent implements OnInit {
  searchQuery: string = '';
  selectedRegion: string = '';
  modismosList: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarModismos();
  }

  cargarModismos(): void {
    this.http.get<any[]>('/api/modismos/').subscribe({
      next: (data) => this.modismosList = data,
      error: () => this.modismosList = this.getFallbackModismos()
    });
  }

  getSignificado(item: any): string {
    if (item.significados && item.significados.length > 0) {
      return item.significados[0].significado;
    }
    return item.descripcion || 'Sin descripción disponible';
  }

  getEjemplo(item: any): string {
    if (item.ejemplos && item.ejemplos.length > 0) {
      return item.ejemplos[0].ejemplo;
    }
    return '';
  }

  get filteredModismos(): any[] {
    return this.modismosList.filter(m => {
      const matchQuery = !this.searchQuery || 
        m.nombre_modismo.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        this.getSignificado(m).toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        this.getEjemplo(m).toLowerCase().includes(this.searchQuery.toLowerCase());
      
      const matchRegion = !this.selectedRegion || 
        m.region.toLowerCase().includes(this.selectedRegion.toLowerCase());

      return matchQuery && matchRegion;
    });
  }

  private getFallbackModismos(): any[] {
    return [
      { nombre_modismo: "¡achachay!", region: "Sierra / Carchi", descripcion: "Expresión que se utiliza para referirse a que la persona experimenta demasiado frío.", ejemplos: [{ ejemplo: "¡achachay! el viento de Tulcán me está congelando." }] },
      { nombre_modismo: "¡chulla vida!", region: "Sierra / Pichincha", descripcion: "Significa que solo hay una vida y hay que disfrutarla al máximo.", ejemplos: [{ ejemplo: "Me voy a ir de viaje con mis amigos, total, ¡es chulla vida!" }] },
      { nombre_modismo: "¡chuta!", region: "Nacional / Sierra", descripcion: "Expresa sorpresa, frustración, enojo o lástima, similar a decir 'rayos'.", ejemplos: [{ ejemplo: "Chuta, se me pasó el bus." }] },
      { nombre_modismo: "¿cachas?", region: "Nacional", descripcion: "Preguntar a la persona si entendió un tema en específico.", ejemplos: [{ ejemplo: "Tuve que cambiar mis horarios de trabajo, ¿cachas?" }] },
      { nombre_modismo: "aquisito nomás", region: "Sierra", descripcion: "Lugar que queda cerca o a corta distancia.", ejemplos: [{ ejemplo: "Vamos a la tienda de aquisito nomás." }] },
      { nombre_modismo: "chuchaqui", region: "Nacional", descripcion: "Malestar o resaca tras consumir licor.", ejemplos: [{ ejemplo: "Juan está comiendo encebollado para curar el chuchaqui." }] },
      { nombre_modismo: "camellar", region: "Nacional", descripcion: "Cuando una persona debe trabajar.", ejemplos: [{ ejemplo: "Mi amigo tuvo que camellar todo el día." }] },
      { nombre_modismo: "de ley", region: "Nacional", descripcion: "Equivalente a por supuesto, sin duda alguna.", ejemplos: [{ ejemplo: "De ley que vamos a esa reunión." }] },
      { nombre_modismo: "de una", region: "Nacional", descripcion: "Realizar una acción de manera inmediata.", ejemplos: [{ ejemplo: "Si van a jugar pelota, de una les caigo." }] },
      { nombre_modismo: "veci", region: "Sierra / Carchi", descripcion: "Usado para dirigirse respetuosamente a un vecino o dependiente.", ejemplos: [{ ejemplo: "Buenos días veci, ¿en qué le puedo ayudar?" }] },
      { nombre_modismo: "no seas malito", region: "Sierra", descripcion: "Expresión típica de la sierra para pedir un favor con cortesía.", ejemplos: [{ ejemplo: "No seas malito préstame el apunte." }] },
      { nombre_modismo: "ponte pilas", region: "Nacional", descripcion: "Estar despierto, concentrado y actuar con diligencia.", ejemplos: [{ ejemplo: "Amigo ponte pilas en la prueba de mañana." }] }
    ];
  }
}
