// Define a global Alpine store for drag-related state and methods.
document.addEventListener('alpine:init', () => {

    Alpine.store('drag', {
        // Vertical drag state
        leftWidth: 800,
        topHeight: 400,

        isDraggingVertical: false,
        startX: 0,
        initLeftWidth: 0,
        
        // Vertical drag functions
        startDragVertical(e) {
            this.isDraggingVertical = true;
            this.startX = e.clientX;
            this.initLeftWidth = this.leftWidth;
            document.body.style.userSelect = 'none';
        },
        doDragVertical(e) {
            if (!this.isDraggingVertical) return;
            const delta = e.clientX - this.startX;
            this.leftWidth = Math.max(200, this.initLeftWidth + delta);
        },
        stopDragVertical() {
            this.isDraggingVertical = false;
            document.body.style.userSelect = '';
        },
    
        // Horizontal drag state
        isDraggingHorizontal: false,
        startY: 0,
        initTopHeight: 0,
    
        // Horizontal drag functions
        startDragHorizontal(e) {
        this.isDraggingHorizontal = true;
        this.startY = e.clientY;
        this.initTopHeight = this.topHeight;
        document.body.style.userSelect = 'none';
        },
        doDragHorizontal(e) {
        if (!this.isDraggingHorizontal) return;
        const delta = e.clientY - this.startY;
        this.topHeight = Math.max(50, this.initTopHeight + delta);
        },
        stopDragHorizontal() {
        this.isDraggingHorizontal = false;
        document.body.style.userSelect = '';
        }
    });
});