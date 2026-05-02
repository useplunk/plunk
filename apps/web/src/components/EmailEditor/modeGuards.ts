import {detectCustomHtmlPatterns} from '../../lib/emailStyles';

export type EmailEditorMode = 'visual' | 'html';

export type ModeToggleDecision = {action: 'switch'; nextMode: EmailEditorMode} | {action: 'block-custom-html'};

export const getInitialEditorMode = (value: string): EmailEditorMode => {
  return detectCustomHtmlPatterns(value) ? 'html' : 'visual';
};

export const getModeToggleDecision = ({
  currentMode,
  htmlContent,
}: {
  currentMode: EmailEditorMode;
  htmlContent: string;
}): ModeToggleDecision => {
  if (currentMode === 'visual') {
    return {action: 'switch', nextMode: 'html'};
  }

  if (detectCustomHtmlPatterns(htmlContent)) {
    return {action: 'block-custom-html'};
  }

  return {action: 'switch', nextMode: 'visual'};
};
