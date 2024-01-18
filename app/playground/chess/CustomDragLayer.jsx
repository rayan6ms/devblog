import { useDragLayer } from 'react-dnd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

function CustomDragLayer() {
  const {
    isDragging,
    item,
    initialOffset,
    currentOffset
  } = useDragLayer((monitor) => ({
    itemType: monitor.getItemType(),
    isDragging: monitor.isDragging(),
    item: monitor.getItem(),
    initialOffset: monitor.getInitialSourceClientOffset(),
    currentOffset: monitor.getSourceClientOffset()
  }));

  function getItemStyles(initialOffset, currentOffset) {
    if (!initialOffset || !currentOffset) {
      return {
        display: "none"
      };
    }

    const x = currentOffset.x - (initialOffset.x - 10);
    const y = currentOffset.y - (initialOffset.y - 15);

    const transform = `translate(${x}px, ${y}px)`;
    return {
      transform,
      WebkitTransform: transform
    };
  }

  if (!isDragging) {
    return null;
  }

  return (
    <div style={{ ...getItemStyles(initialOffset, currentOffset), zIndex: 70 }}>
      <FontAwesomeIcon
        icon={item.type}
        className={`${item.textColor} absolute scale-110 fa-3x`}
      />
    </div>
  );
}

export default CustomDragLayer;