import React from 'react';

export interface AlertProps {
  type: 'info' | 'danger' | 'warning' | 'success';
  title: string;
  children?: string | React.ReactNode;
}

const styles = {
  info: 'bg-blue-50 text-blue-800 border-blue-300',
  danger: 'bg-red-50 text-red-800 border-red-300',
  warning: 'bg-yellow-50 text-yellow-800 border-yellow-300',
  success: 'bg-green-50 text-green-800 border-green-300',
};

/**
 * @param root0
 * @param root0.type
 * @param root0.title
 * @param root0.children
 */
export default function Alert({type = 'info', title, children}: AlertProps) {
  const classNames = ['w-full px-7 py-5 border rounded-lg'];
  classNames.push(styles[type]);

  return (
    <div className={classNames.join(' ')}>
      <p className={'font-medium'}>{title}</p>
      <p className={'text-sm'}>{children}</p>
    </div>
  );
}
