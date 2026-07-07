export interface AnimatedListItem {
  name: string;
  description: string;
  icon: string;
  color: string;
  time: string;
}

export interface AnimatedListDisplayOptions {
  showIcon: boolean;
  showName: boolean;
  showDescription: boolean;
  showTime: boolean;
}

export interface AnimatedListPuckProps extends AnimatedListDisplayOptions {
  items: AnimatedListItem[];
  delay: number;
  containerHeight: number;
  itemMaxWidth: number;
  showBottomFade: boolean;
  repeatCycles: number;
  gap: number;
}
