import {detectCustomHtmlPatterns} from '../../lib/emailStyles';

export type EmailEditorMode = 'visual' | 'html';

export type ModeToggleDecision = {action: 'switch'; nextMode: EmailEditorMode; snapshot?: string};

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

  // WHY: custom HTML detection has false positives, so we allow the switch
  // but snapshot the original HTML so the user can revert without data loss
  if (detectCustomHtmlPatterns(htmlContent)) {
    return {action: 'switch', nextMode: 'visual', snapshot: htmlContent};
  }

  return {action: 'switch', nextMode: 'visual'};
};
