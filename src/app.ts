// Drag & Drop Interfaces
interface Draggable {
  dragStartHandler(event: DragEvent): void;
  dragEndHandler(event: DragEvent): void;
}

interface DragTarget {
  dragOverHandler(event: DragEvent): void;
  dropHandler(event: DragEvent): void;
  dragLeaveHandler(event: DragEvent): void;
}

// Validation
interface Validatable {
  value: string | number;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

// @validate decorator
function validate(validatableInput: Validatable) {
  let isValid = true;
  if (validatableInput.required) {
    isValid = isValid && validatableInput.value.toString().trim().length !== 0;
  }
  if (
    validatableInput.minLength != null &&
    typeof validatableInput.value === 'string'
  ) {
    isValid =
      isValid && validatableInput.value.length >= validatableInput.minLength;
  }
  if (
    validatableInput.maxLength != null &&
    typeof validatableInput.value === 'string'
  ) {
    isValid =
      isValid && validatableInput.value.length <= validatableInput.maxLength;
  }
  if (
    validatableInput.min != null &&
    typeof validatableInput.value === 'number'
  ) {
    isValid = isValid && validatableInput.value >= validatableInput.min;
  }
  if (
    validatableInput.max != null &&
    typeof validatableInput.value === 'number'
  ) {
    isValid = isValid && validatableInput.value <= validatableInput.max;
  }
  return isValid;
}

// autobind decorator
function autobind(_: any, _2: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  const adjDescriptor: PropertyDescriptor = {
    configurable: true,
    get() {
      const boundFn = originalMethod.bind(this);
      return boundFn;
    }
  };
  return adjDescriptor;
}

enum ProjectStatus {
  Active = 'active',
  Finished = 'finished'
}

class Project {
  public status: ProjectStatus
  constructor(
    public id: string,
    public title: string,
    public description: string,
    public people: number,
  ) {
    this.status = ProjectStatus.Active
  }
}


// State
type Listener<T> = (projects: T[]) => void
abstract class State<T> {
  protected listeners: Listener<T>[] = [];

  addListener(fn: Listener<T>) {
    this.listeners.push(fn)
  }
}

// Project State
class ProjectState extends State<Project> {
  private projects: Project[] = [];
  private static instance: ProjectState ;

  private constructor() {
    super()
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new ProjectState()
      return this.instance
    }
      return this.instance
  }

  addProject(title: string, description: string, people: number) {
    const project = new Project(
      Math.random().toString(),
      title,
      description,
      people
    )

    this.projects.push(project);
    this.updateListeners()
  }

  moveProject(projectId: string, newStatus: ProjectStatus) {
    const found = this.projects.find(prj => prj.id === projectId)!
    found.status = newStatus
    this.updateListeners()
  }

  updateListeners() {
    this.listeners.forEach((fn) => fn([...this.projects]))
  }
}

// instantiate + add at click
const projectState = ProjectState.getInstance()

// Component
abstract class Component<T extends HTMLElement, U extends HTMLElement> {
  hostElement: T;
  templateElement: HTMLTemplateElement;
  element: U;

  constructor(
   public hostId: string,
   public templateId: string,
   public position: InsertPosition,
   public customId: string
  ) {
    this.hostElement = document.getElementById(hostId)! as T;
    this.templateElement = document.getElementById(templateId)! as HTMLTemplateElement;


    const importedNode = document.importNode( this.templateElement.content, true);
    this.element = importedNode.firstElementChild as U
    this.element.id = customId;

    this.attach();
  }

  private attach() {
    this.hostElement.insertAdjacentElement(this.position, this.element);
  }

   protected abstract configure(): void
   protected abstract render(): void
}

// Project List
class ProjectList extends Component<HTMLDivElement, HTMLTemplateElement> implements DragTarget {
  assignedProjects: Project[]

  constructor(private type: ProjectStatus) {
    super('app', 'project-list', 'beforeend', `${type}-projects`)
    this.assignedProjects = []
    this.configure();
    this.render();
  }

  @autobind
  dragOverHandler(event: DragEvent): void {
    if (event.dataTransfer && event.dataTransfer.types[0] === 'text/plain') {
      const listEl = this.element.querySelector('ul')!
      listEl.classList.add('droppable')
      event.preventDefault()
    }

  }
  @autobind
  dropHandler(event: DragEvent): void {
    if (event.dataTransfer && event.dataTransfer.getData('text/plain')) {
      const listEl = this.element.querySelector('ul')!
      const id = event.dataTransfer.getData('text/plain')
      projectState.moveProject(id, this.type === ProjectStatus.Active? ProjectStatus.Active : ProjectStatus.Finished)
      listEl.classList.remove('droppable')
    }
  }
  @autobind
  dragLeaveHandler(_event: DragEvent): void {
    const listEl = this.element.querySelector('ul')!
    listEl.classList.remove('droppable')
  }


  private renderProjects() {
    const list = document.getElementById(`${this.type}-projects-list`) as HTMLUListElement
    list.innerHTML = ''
    this.assignedProjects.forEach((project) => {
      new ProjectItem(this.element.querySelector('ul')!.id, project)
    })
  }

  protected configure(): void {
    projectState.addListener((projects: Project[]) => {
      const filtered = projects.filter(prj => prj.status === this.type)
      this.assignedProjects = filtered
      this.renderProjects()
    })

    this.element.addEventListener('dragover', this.dragOverHandler)
    this.element.addEventListener('drop', this.dropHandler)
    this.element.addEventListener('dragleave', this.dragLeaveHandler)
  }

  protected render() {
    const listId = `${this.type}-projects-list`
    this.element.querySelector('h2')!.textContent = `${this.type.toUpperCase()} + PROJECTS`
    this.element.querySelector('ul')!.id = listId
  }
}

// Project item
class ProjectItem extends Component<HTMLUListElement, HTMLLIElement> implements Draggable {
  get persons() {
    const n = this.project.people
    if (n > 1) {
      return `${n} persons`
    }
    return '1 person'
  }

  constructor(public hostId: string, private project: Project) {
    super(hostId, 'single-project', 'beforeend', project.id)
    this.configure()
    this.render()
  }

  @autobind
  dragStartHandler(event: DragEvent): void {
    event.dataTransfer!.setData('text/plain', this.project.id)
    event.dataTransfer!.effectAllowed = 'move'
  }

  @autobind
  dragEndHandler(_event: DragEvent): void {
  }

  protected configure(): void {
    this.element.addEventListener('dragstart', this.dragStartHandler)
    this.element.addEventListener('dragend', this.dragEndHandler)
  }

  protected render(): void {
    this.element.querySelector('h2')!.textContent = this.project.title;
    this.element.querySelector('h3')!.textContent = this.persons + ' assigned';
    this.element.querySelector('p')!.textContent = this.project.description;
  }
}

// ProjectInput Class
class ProjectInput extends Component<HTMLDivElement, HTMLTemplateElement> {
  titleInputElement: HTMLInputElement;
  descriptionInputElement: HTMLInputElement;
  peopleInputElement: HTMLInputElement;

  constructor() {
    super('app','project-input', 'afterbegin', 'user-input' )

    this.titleInputElement = this.element.querySelector(
      '#title'
    ) as HTMLInputElement;
    this.descriptionInputElement = this.element.querySelector(
      '#description'
    ) as HTMLInputElement;
    this.peopleInputElement = this.element.querySelector(
      '#people'
    ) as HTMLInputElement;

    this.configure();
    this.render();
  }

  private gatherUserInput(): [string, string, number] | void {
    const enteredTitle = this.titleInputElement.value;
    const enteredDescription = this.descriptionInputElement.value;
    const enteredPeople = this.peopleInputElement.value;

    const titleValidatable: Validatable = {
      value: enteredTitle,
      required: true
    };
    const descriptionValidatable: Validatable = {
      value: enteredDescription,
      required: true,
      minLength: 5
    };
    const peopleValidatable: Validatable = {
      value: +enteredPeople,
      required: true,
      min: 1,
      max: 5
    };

    if (
      !validate(titleValidatable) ||
      !validate(descriptionValidatable) ||
      !validate(peopleValidatable)
    ) {
      alert('Invalid input, please try again!');
      return;
    } else {
      return [enteredTitle, enteredDescription, +enteredPeople];
    }
  }

  private clearInputs() {
    this.titleInputElement.value = '';
    this.descriptionInputElement.value = '';
    this.peopleInputElement.value = '';
  }

  @autobind
  private submitHandler(event: Event) {
    event.preventDefault();
    const userInput = this.gatherUserInput();
    if (Array.isArray(userInput)) {
      const [title, desc, people] = userInput;
      projectState.addProject(title,desc,people)
      this.clearInputs();
    }
  }

  protected configure() {
    this.element.addEventListener('submit', this.submitHandler);
  }

  protected render(): void {
    // throw new Error("Method not implemented.");
  }
}

const prjInput = new ProjectInput();
const activePrjList = new ProjectList(ProjectStatus.Active)
const finishedPrjList = new ProjectList(ProjectStatus.Finished)