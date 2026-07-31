import { Component, ViewChild, ViewContainerRef, Injector, importProvidersFrom, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chatbot-loader',
  standalone: true,
  imports: [CommonModule],
  template: '<ng-template #container></ng-template>'
})
export class ChatbotLoader implements OnInit {
  @ViewChild('container', { read: ViewContainerRef, static: true }) container!: ViewContainerRef;

  constructor(private injector: Injector) {}

  ngOnInit() {
    import('./chatbot').then(m => {
      this.container.createComponent(m.Chatbot, { injector: this.injector });
    });
  }
}
