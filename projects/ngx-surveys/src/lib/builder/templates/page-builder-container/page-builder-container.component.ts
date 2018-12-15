import {Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges} from '@angular/core';
import {fromEvent, Subscription} from 'rxjs';
import {map} from 'rxjs/operators';
import {select, Store} from '@ngrx/store';
import {UUID} from 'angular2-uuid';
import {CdkDragDrop} from '@angular/cdk/drag-drop';

import {IPage, IPageMap} from '../../../models/page.model';
import {NgxSurveyState} from '../../../store/ngx-survey.state';
import * as fromRoot from '../../../store/ngx-survey.reducer';
import * as pages from '../../../store/pages/pages.actions';
import * as elements from '../../../store/elements/elements.actions';
import {debounceTime, distinctUntilChanged} from 'rxjs/internal/operators';
import {IElementsMap} from '../../../models/elements.model';

@Component({
  selector: 'ngxs-page-builder-container',
  templateUrl: './page-builder-container.component.html',
  styleUrls: ['./page-builder-container.component.scss']
})
export class PageBuilderContainerComponent implements OnInit, OnDestroy, OnChanges {
  @Input() surveyId: string;
  @Input() page: IPage;
  @Input() pages: IPageMap;
  pageSizeSub: Subscription;
  pageSize: number;
  elementsSub: Subscription;
  elements: IElementsMap;
  elementsSize: number;
  isEditPage: boolean;
  isSavedMap = new Map<string, boolean>();

  constructor(
    private store: Store<NgxSurveyState>
  ) {
  }

  ngOnInit() {
    this.pageSizeSub = this.store.pipe(select(fromRoot.getPagesSize)).subscribe(res => {
      this.pageSize = res;
    });

    this.elementsSub = this.store.pipe(select(fromRoot.getElementsByPageId, { pageId: this.page.id })).subscribe(res => {
      this.elements = res;
      if (res) {
        this.elementsSize = res.size;
        this.setSavedMap();
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
  }

  ngOnDestroy() {
    this.elementsSub.unsubscribe();
    this.pageSizeSub.unsubscribe();
  }

  removePage(pageId: string) {
    const elementIds = Array.from(this.elements).reduce((array, el) => [...array, el[0]], []);
    this.store.dispatch(new pages.RemovePageAction({ pageId, elementIds }));
  }

  insertPage(previousPageId: string) {
    const pageId = UUID.UUID();
    this.store.dispatch(new pages.InsertPageAction({ previousPageId, surveyId: this.surveyId, pageId }));
  }

  movePageDown(pageId: string) {
    this.store.dispatch(new pages.MovePageDownAction({ pageId }));
  }

  movePageUp(pageId: string) {
    this.store.dispatch(new pages.MovePageUpAction({ pageId }));
  }

  addElement(pageId: string) {
    this.store.dispatch(new elements.AddElementAction({ pageId }));
  }

  onEditPageClick(pageId: string) {
    this.isEditPage = true;
    setTimeout(() => {
      this.editPageName(pageId);
      this.editPageDescription(pageId);
    }, 300);
  }

  editPageName(pageId: string) {
    const $pageNameInput = document.getElementById(`page-name-input-${pageId}`);

    fromEvent($pageNameInput, 'input').pipe(
      map((event: any) => event.target.value),
      distinctUntilChanged(),
      debounceTime(1000)
    ).subscribe(name => {
      this.store.dispatch(new pages.UpdatePageNameAction({ pageId, name }));
    });
  }

  editPageDescription(pageId: string) {
    const $pageDescriptionInput = document.getElementById(`page-description-input-${pageId}`);

    fromEvent($pageDescriptionInput, 'input').pipe(
      map((event: any) => event.target.value),
      distinctUntilChanged(),
      debounceTime(1000)
    ).subscribe(description => {
      this.store.dispatch(new pages.UpdatePageDescriptionAction({ pageId, description }));
    });
  }

  drop(event: CdkDragDrop<string[]>, pageId: string) {
    this.store.dispatch(new elements.DragElementAction({
      pageId,
      startIndex: event.previousIndex,
      endIndex: event.currentIndex,
    }));
  }

  handleIsSavedEvent({ key, isSaved }) {
    this.isSavedMap.set(key, isSaved);
  }

  private setSavedMap() {
    this.elements.forEach((value, key) => {
      if (value.isSaved) {
        this.isSavedMap.set(key, true);
      } else {
        this.isSavedMap.set(key, false);
      }
    });
  }

  trackElement(index: number, item: any) {
    return item ? item.key : null;
  }
}