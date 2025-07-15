import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { RecipesService } from '../../services/recipes';
import { Router } from '@angular/router';
import { FormatInstructionsPipe } from '../../pipes/format-instructions.pipe';
import { fadeInOut } from '../../animations';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, FormatInstructionsPipe],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
  animations: [fadeInOut]
})
export class Home implements OnInit {
  userProfile: any = {
    name: 'Usuario',
    email: '',
    avatar: 'assets/img/default-avatar.png'
  };
  recipes: any[] = [];
  filteredRecipes: any[] = [];
  searchTerm: string = '';
  showProfile: boolean = false;
  selectedRecipe: any = null;
  isLoading: boolean = true;
  showAddForm: boolean = false;
  currentPage: number = 1;
  itemsPerPage: number = 20;
  totalItems: number = 0;
  recipeForm: FormGroup;
  editingIndex: number | null = null;
  recipeToDelete: number | null = null;


  constructor(
    private authService: AuthService,
    private recipesService: RecipesService,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.recipeForm = this.fb.group({
      strMeal: ['', Validators.required],
      strCategory: ['', Validators.required],
      strArea: ['', Validators.required],
      strInstructions: ['', Validators.required],
      strMealThumb: ['', Validators.required],
      ingredients: this.fb.array([this.createIngredient()])
      // Puedes agregar más ingredientes según necesites
    });
  }

  get ingredients(): FormArray {
    return this.recipeForm.get('ingredients') as FormArray;
  }
  createIngredient(): FormGroup {
    return this.fb.group({
      name: [''],
      measure: ['']
    });
  }
  addIngredient(): void {
    this.ingredients.push(this.createIngredient());
  }

  // Eliminar un ingrediente
  removeIngredient(index: number): void {
    this.ingredients.removeAt(index);
  }

  ngOnInit() {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth']);
      return;
    }

    this.userProfile = this.authService.getCurrentUser();
    this.loadRecipes();
  }


  loadUserProfile(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.userProfile = {
        name: currentUser.name || 'Usuario',
        email: currentUser.email,
        // Usamos image si existe, si no avatar, si no la imagen por defecto
        avatar: currentUser.image || currentUser.avatar || 'assets/img/default-avatar.png'
      };
    }
  }

  toggleProfile() {
    this.showProfile = !this.showProfile;
  }

  loadRecipes() {
    this.isLoading = true;
    this.recipesService.getRecipes().subscribe({
      next: (data: any) => {
        this.recipes = data.meals || [];
        this.totalItems = this.recipes.length;
        this.filteredRecipes = [...this.recipes];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading recipes:', error);
        this.isLoading = false;
      }
    });
  }

  searchRecipes() {
    if (this.searchTerm.trim() === '') {
      this.filteredRecipes = [...this.recipes];
      this.currentPage = 1;
      this.totalItems = this.filteredRecipes.length;
      return;
    }

    this.recipesService.searchRecipes(this.searchTerm).subscribe({
      next: (data: any) => {
        this.filteredRecipes = data.meals || [];
        this.currentPage = 1;
        this.totalItems = this.filteredRecipes.length;
      }
    });
  }

  confirmDelete(index: number) {
    this.recipeToDelete = index;
  }

  cancelDelete() {
    this.recipeToDelete = null;
  }

  get paginatedRecipes() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredRecipes.slice(startIndex, startIndex + this.itemsPerPage);
  }

  onPageChange(page: number) {
    this.currentPage = page;
  }

  removeRecipe() {
    if (this.recipeToDelete !== null) {
      this.filteredRecipes.splice(this.recipeToDelete, 1);
      this.recipeToDelete = null;
      this.totalItems = this.filteredRecipes.length;
      // Ajustar página si quedó vacía
      if (this.paginatedRecipes.length === 0 && this.currentPage > 1) {
        this.currentPage--;
      }
    }
  }
  startEditing(index: number) {
    this.editingIndex = index;
    const recipe = this.paginatedRecipes[index];

    // Limpiar ingredientes existentes
    while (this.ingredients.length) {
      this.ingredients.removeAt(0);
    }

    // Añadir ingredientes desde la receta
    let i = 1;
    while (recipe['strIngredient' + i]) {
      this.ingredients.push(this.fb.group({
        name: [recipe['strIngredient' + i]],
        measure: [recipe['strMeasure' + i]]
      }));
      i++;
    }

    // Si no hay ingredientes, añadir uno vacío
    if (this.ingredients.length === 0) {
      this.ingredients.push(this.createIngredient());
    }

    this.recipeForm.patchValue({
      strMeal: recipe.strMeal,
      strCategory: recipe.strCategory,
      strArea: recipe.strArea,
      strInstructions: recipe.strInstructions,
      strMealThumb: recipe.strMealThumb
    });
  }

  cancelEditing() {
    this.editingIndex = null;
    this.recipeForm.reset();
  }

  saveEdit() {
    if (this.editingIndex !== null && this.recipeForm.valid) {
      const startIndex = (this.currentPage - 1) * this.itemsPerPage;
      const actualIndex = startIndex + this.editingIndex;
      const formValue = this.recipeForm.value;

      const updatedRecipe = {
        ...this.filteredRecipes[actualIndex],
        strMeal: formValue.strMeal,
        strCategory: formValue.strCategory,
        strArea: formValue.strArea,
        strInstructions: formValue.strInstructions,
        strMealThumb: formValue.strMealThumb
      };

      // Actualizar ingredientes
      formValue.ingredients.forEach((ingredient: any, index: number) => {
        updatedRecipe['strIngredient' + (index + 1)] = ingredient.name;
        updatedRecipe['strMeasure' + (index + 1)] = ingredient.measure;
      });

      // Eliminar ingredientes sobrantes si hubo menos en la edición
      let i = formValue.ingredients.length + 1;
      while (updatedRecipe['strIngredient' + i]) {
        delete updatedRecipe['strIngredient' + i];
        delete updatedRecipe['strMeasure' + i];
        i++;
      }

      this.filteredRecipes[actualIndex] = updatedRecipe;
      this.editingIndex = null;
      this.recipeForm.reset();
      // Restablecer el FormArray
      while (this.ingredients.length) {
        this.ingredients.removeAt(0);
      }
      this.ingredients.push(this.createIngredient());
    }
  }

  addRecipe() {
    if (this.recipeForm.valid) {
      const formValue = this.recipeForm.value;
      const newRecipe: any = {
        idMeal: 'new-' + Math.random().toString(36).substr(2, 9),
        strMeal: formValue.strMeal,
        strCategory: formValue.strCategory,
        strArea: formValue.strArea,
        strInstructions: formValue.strInstructions,
        strMealThumb: formValue.strMealThumb
      };

      // Convertir los ingredientes al formato strIngredient1, strMeasure1, etc.
      formValue.ingredients.forEach((ingredient: any, index: number) => {
        newRecipe['strIngredient' + (index + 1)] = ingredient.name;
        newRecipe['strMeasure' + (index + 1)] = ingredient.measure;
      });

      this.filteredRecipes.unshift(newRecipe);
      this.totalItems = this.filteredRecipes.length;
      this.recipeForm.reset();
      // Restablecer el FormArray con un ingrediente vacío
      while (this.ingredients.length) {
        this.ingredients.removeAt(0);
      }
      this.ingredients.push(this.createIngredient());
      this.showAddForm = false;
      this.currentPage = 1;
    }
  }

  toggleAddForm() {
    this.showAddForm = !this.showAddForm;
    if (this.showAddForm) {
      this.recipeForm.reset();
      // Restablecer el FormArray con un ingrediente vacío
      while (this.ingredients.length) {
        this.ingredients.removeAt(0);
      }
      this.ingredients.push(this.createIngredient());
    }
  }

  logout() {
    this.authService.logout();
  }

  viewRecipe(recipe: any) {
    this.selectedRecipe = recipe;
  }
  getPageNumbers(): number[] {
    const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    const pagesToShow = 5; // Número máximo de páginas a mostrar
    const pages: number[] = [];

    if (totalPages <= pagesToShow) {
      // Mostrar todas las páginas
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Mostrar páginas alrededor de la actual
      let startPage = Math.max(1, this.currentPage - Math.floor(pagesToShow / 2));
      let endPage = startPage + pagesToShow - 1;

      if (endPage > totalPages) {
        endPage = totalPages;
        startPage = endPage - pagesToShow + 1;
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }

    return pages;
  }
}