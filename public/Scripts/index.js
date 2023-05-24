/* Pagination code for the index page */

// const prevPageLink = document.getElementById("prev-page");
const nextPageLink = document.getElementById("next-page");
let currentPage = 1;

// prevPageLink.addEventListener("click", () => {
//   if (currentPage > 1) {
//     currentPage--;
//     loadRecipes();
//   }
// });

nextPageLink.addEventListener("click", () => {
  currentPage++;
  loadRecipes();
});

function loadRecipes() {
  fetch(`/recipes?page=${currentPage}`)
    .then(response => response.text())
    .then(html => {
      const parser = new DOMParser();
      const newDoc = parser.parseFromString(html, "text/html");

      const recipeContainer = document.querySelector(".row");
      recipeContainer.innerHTML = newDoc.querySelector(".row").innerHTML;

      // prevPageLink.classList.toggle("disabled", currentPage === 1);
    })
    .catch(error => console.error(error));
}